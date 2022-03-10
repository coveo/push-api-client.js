import {DocumentBuilder} from '../documentBuilder';
import {
  BatchUpdateDocuments,
  UploadBatchCallbackData,
  ConcurrentProcessing,
} from '../interfaces';
import {parseAndGetDocumentBuilderFromJSONDocument} from '../validation/parseFile';
import {basename} from 'path';
import {consumeGenerator} from './generator';
import {AxiosResponse} from 'axios';

export type SuccessCallback = (data: UploadBatchCallbackData) => void;
export type ErrorCallback = (
  err: unknown,
  value: UploadBatchCallbackData
) => void;

export class FileConsumer {
  // TODO: initialize with dummy functions
  private cbSuccess: SuccessCallback = () => {};
  private cbFail: ErrorCallback = () => {};

  public constructor(
    private upload: (
      batch: BatchUpdateDocuments
    ) => Promise<AxiosResponse<any, any>>, // TODO: review any
    private processingConfig: Required<ConcurrentProcessing>
  ) {}

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
        this.processingConfig.maxConcurrent
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

        if (
          accumulator.size + sizeOfDoc >=
          this.processingConfig.maxContentLength
        ) {
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
