import {DocumentBuilder} from '../documentBuilder';
import {
  BatchUpdateDocuments,
  UploadBatchCallbackData,
  ConcurrentProcessing,
  ParseDocumentOptions,
} from '../interfaces';
import {parseAndGetDocumentBuilderFromJSONDocument} from '../validation/parseFile';
import {basename} from 'path';
import {consumeGenerator} from './generator';
import {AxiosResponse} from 'axios';

export type SuccessfulUploadCallback = (data: UploadBatchCallbackData) => void;
export type FailedUploadCallback = (
  err: unknown,
  value: UploadBatchCallbackData
) => void;

/**
 * Util class to help injesting documents through a list of files and uploading generated document batches.
 */
export class FileConsumer {
  private static maxContentLength = 5 * 1024 * 1024;
  private cbSuccess: SuccessfulUploadCallback = () => {};
  private cbFail: FailedUploadCallback = () => {};

  /**
   * Creates an instance of FileConsumer.
   * @param {(batch: BatchUpdateDocuments) => Promise<AxiosResponse>} upload the upload operation to apply to every document batch
   * @param {Required<ConcurrentProcessing>} processingConfig
   */
  public constructor(
    private upload: (batch: BatchUpdateDocuments) => Promise<AxiosResponse>,
    private processingConfig: Required<ConcurrentProcessing>
  ) {}

  public async consume(files: string[], options?: ParseDocumentOptions) {
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
        const docBuilders = parseAndGetDocumentBuilderFromJSONDocument(
          filePath,
          options
        );
        yield* docBuilderGenerator(docBuilders);
      }
    };

    await consumeGenerator(
      fileGenerator.bind(this),
      this.processingConfig.maxConcurrent
    );
    await close();
  }

  public onSuccess(callback: SuccessfulUploadCallback) {
    this.cbSuccess = callback;
  }

  public onError(callback: FailedUploadCallback) {
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

        if (accumulator.size + sizeOfDoc >= FileConsumer.maxContentLength) {
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
    let res: AxiosResponse | undefined;
    try {
      res = await this.upload({
        addOrUpdate: batch,
        delete: [],
      });
    } catch (error) {
      this.cbFail(error, {
        files: fileNames,
        batch,
      });
    }

    this.cbSuccess({
      files: fileNames,
      batch,
      res,
    });
  }

  private get accumulator(): {size: number; chunks: DocumentBuilder[]} {
    return {
      size: 0,
      chunks: [],
    };
  }
}
