import {DocumentBuilder, UploadBatchCallbackData} from '..';
import {parseAndGetDocumentBuilderFromJSONDocument} from '../validation/parseFile';
import {basename} from 'path';
import {consumeGenerator} from '../help/generator';
import {Strategy} from './streamStrategy';

type SuccessCallback = (data: UploadBatchCallbackData) => void;
type ErrorCallback = (err: unknown, value: UploadBatchCallbackData) => void;

// TODO: rename StrategyConsumer
export class BatchConsumer {
  private static maxContentLength = 5 * 1024 * 1024;
  // TODO: initialize with dummy functions
  private cbSuccess: SuccessCallback = () => {};
  private cbFail: ErrorCallback = () => {};

  public constructor(private strategy: Strategy) {}

  public consume(files: string[]) {
    const done = async () => {
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

      await consumeGenerator(fileGenerator.bind(this), maxConcurrent);
      await close();
    };

    const onBatchUpload = (callback: SuccessCallback) =>
      this.onSuccess(callback);
    const onBatchError = (callback: ErrorCallback) => this.onError(callback);

    return {
      onBatchUpload,
      onBatchError,
      done,
    };
  }

  public onSuccess(callback: SuccessCallback): BatchConsumer {
    this.cbSuccess = callback;
    return this;
  }

  public onError(callback: ErrorCallback): BatchConsumer {
    this.cbFail = callback;
    return this;
  }

  public splitByChunkAndUpload(
    fileNames: string[],
    accumulator = this.accumulator
  ) {
    const chunksToUpload = (documentBuilders: DocumentBuilder[]) => {
      const batchesToUpload: Array<() => Promise<void>> = [];

      for (const docBuilder of documentBuilders) {
        const sizeOfDoc = Buffer.byteLength(
          JSON.stringify(docBuilder.marshal())
        );

        if (accumulator.size + sizeOfDoc >= BatchConsumer.maxContentLength) {
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
      const res = await this.strategy.upload({
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
