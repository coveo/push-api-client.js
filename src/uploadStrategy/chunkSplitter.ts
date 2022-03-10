import {DocumentBuilder} from '../documentBuilder';
import {
  BatchUpdateDocuments,
  UploadBatchCallbackData,
  ConcurrentProcessing,
} from '../source/interfaces';
import {parseAndGetDocumentBuilderFromJSONDocument} from '../validation/parseFile';
import {basename} from 'path';
import {consumeGenerator} from '../help/generator';
import {AxiosResponse} from 'axios';

// TODO: put in interface
export interface Strategy {
  doTheMagic: (
    sourceId: string,
    files: string[]
  ) => Promise<{
    onBatchError: (callback: ErrorCallback) => void;
    onBatchUpload: (callback: SuccessCallback) => void;
    done: () => Promise<void>;
  }>;
  doTheMagicSingleBatch: (
    sourceId: string,
    batch: BatchUpdateDocuments
  ) => void;
}

// TODO: put in interface
export type SuccessCallback = (data: UploadBatchCallbackData) => void;
export type ErrorCallback = (
  err: unknown,
  value: UploadBatchCallbackData
) => void;

export interface BatchConsumerOptions extends ConcurrentProcessing {
  maxContentLength?: number;
}

// TODO: rename StrategyConsumer
export class BatchConsumer {
  private static defaultOptions: Required<BatchConsumerOptions> = {
    maxConcurrent: 10,
    maxContentLength: 5 * 1024 * 1024,
  };
  private options: Required<BatchConsumerOptions>;
  // TODO: initialize with dummy functions
  private cbSuccess: SuccessCallback = () => {};
  private cbFail: ErrorCallback = () => {};

  // public constructor(private strategy: Strategy) {}
  public constructor(
    private upload: (
      batch: BatchUpdateDocuments
    ) => Promise<AxiosResponse<any, any>>, // TODO: review any
    options?: BatchConsumerOptions
  ) {
    this.options = {...BatchConsumer.defaultOptions, ...options};
  }

  public consume(files: string[]) {
    const consumePromise = async () => {
      const fileNames = files.map((path) => basename(path));
      const {chunksToUpload, close} = this.splitByChunkAndUpload(fileNames);

      const docBuilderGenerator = function* (docBuilders: DocumentBuilder[]) {
        for (const upload of chunksToUpload(docBuilders)) {
          yield upload();
        }
      };

      // parallelize uploads across multiple files
      const fileGenerator = function* () {
        for (const filePath of files.values()) {
          const docBuilders =
            parseAndGetDocumentBuilderFromJSONDocument(filePath);
          yield* docBuilderGenerator(docBuilders);
        }
      };

      await consumeGenerator(
        fileGenerator.bind(this),
        this.options.maxConcurrent
      );
      await close();
    };

    return {
      onBatchUpload: (callback: SuccessCallback) => this.onSuccess(callback),
      onBatchError: (callback: ErrorCallback) => this.onError(callback),
      promise: consumePromise(),
    };
  }

  private onSuccess(callback: SuccessCallback) {
    this.cbSuccess = callback;
  }

  private onError(callback: ErrorCallback) {
    this.cbFail = callback;
  }

  private splitByChunkAndUpload(
    fileNames: string[],
    accumulator = this.accumulator
  ) {
    const chunksToUpload = (documentBuilders: DocumentBuilder[]) => {
      const batchesToUpload: Array<() => Promise<void>> = [];

      for (const docBuilder of documentBuilders) {
        const sizeOfDoc = Buffer.byteLength(
          JSON.stringify(docBuilder.marshal())
        );

        if (accumulator.size + sizeOfDoc >= this.options.maxContentLength) {
          const chunks = accumulator.chunks;
          if (chunks.length > 0) {
            batchesToUpload.push(() => this.uploadBatch(chunks, fileNames));
          }
          accumulator.chunks = [docBuilder];
          accumulator.size = sizeOfDoc;
        } else {
          accumulator.size += sizeOfDoc;
          accumulator.chunks.push(docBuilder);
        }
      }
      return batchesToUpload;
    };
    const close = async () => {
      await this.uploadBatch(accumulator.chunks, fileNames);
    };
    return {chunksToUpload, close};
  }

  private async uploadBatch(batch: DocumentBuilder[], fileNames: string[]) {
    try {
      const res = await this.upload({
        addOrUpdate: batch,
        delete: [],
      });
      this.cbSuccess({
        files: fileNames,
        batch,
        res,
      });
    } catch (e: unknown) {
      this.cbFail(e, {
        files: fileNames,
        batch,
      });
    }
  }

  private get accumulator(): {size: number; chunks: DocumentBuilder[]} {
    return {
      size: 0,
      chunks: [],
    };
  }
}
