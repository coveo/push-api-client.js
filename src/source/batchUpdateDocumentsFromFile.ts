import {getAllJsonFilesFromEntries} from '../help/file';
import {FileConsumer} from '../help/fileConsumer';
import {
  BatchUpdateDocuments,
  BatchUpdateDocumentsFromFiles,
  FailedUploadCallback,
  FieldAnalyser,
  SuccessfulUploadCallback,
} from '../index';
import {parseAndGetDocumentBuilderFromJSONDocument} from '../validation/parseFile';
import type {PushSource} from './push';

export class BatchUpdateDocumentsFromFilesReturn {
  private internalPromise: () => Promise<void>;
  private batchConsumer: FileConsumer;

  constructor(
    pushSource: PushSource,
    sourceId: string,
    filesOrDirectories: string[],
    options?: BatchUpdateDocumentsFromFiles
  ) {
    const defaultOptions = {
      maxConcurrent: 10,
      createFields: true,
    };
    const {maxConcurrent, createFields} = {
      ...defaultOptions,
      ...options,
    };

    this.batchConsumer = new FileConsumer(
      (batch: BatchUpdateDocuments) => pushSource.uploadBatch(sourceId, batch),
      {maxConcurrent}
    );

    this.internalPromise = (async () => {
      const files = getAllJsonFilesFromEntries(filesOrDirectories);
      if (createFields) {
        const analyser = new FieldAnalyser(pushSource.platformClient);
        for (const filePath of files.values()) {
          const docBuilders =
            parseAndGetDocumentBuilderFromJSONDocument(filePath);
          await analyser.add(docBuilders);
        }
        await pushSource.createFields(analyser);
      }
      await this.batchConsumer.consume(files);
    }).bind(this);
  }

  public onBatchUpload(cb: SuccessfulUploadCallback) {
    this.batchConsumer.onSuccess(cb);
    return this;
  }

  public onBatchError(cb: FailedUploadCallback) {
    this.batchConsumer.onError(cb);
    return this;
  }

  public batch() {
    return this.internalPromise();
  }
}
