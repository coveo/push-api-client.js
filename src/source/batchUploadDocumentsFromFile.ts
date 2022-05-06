import PlatformClient from '@coveord/platform-client';
import {getAllJsonFilesFromEntries} from '../help/file';
import {FileConsumer} from '../help/fileConsumer';
import {
  BatchUpdateDocuments,
  BatchUpdateDocumentsFromFiles,
  FailedUploadCallback,
  FieldAnalyser,
  SuccessfulUploadCallback,
} from '../index';
import type {UploadStrategy} from '../uploadStrategy';

export class BatchUploadDocumentsFromFilesReturn {
  private internalPromise: () => Promise<void>;
  private consumer: FileConsumer;

  constructor(
    platformClient: PlatformClient,
    strategy: UploadStrategy,
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

    this.consumer = new FileConsumer(
      (batch: BatchUpdateDocuments) => strategy.upload(batch),
      {maxConcurrent}
    );

    this.internalPromise = (async () => {
      const files = getAllJsonFilesFromEntries(filesOrDirectories);
      if (createFields) {
        const analyser = new FieldAnalyser(platformClient);
        await analyser.addFromFiles(filesOrDirectories);
        await analyser.report().createMissingFields(options);
      }

      await this.consumer.consume(files);
      await strategy.postUpload?.();
    }).bind(this);
  }

  public onBatchUpload(cb: SuccessfulUploadCallback) {
    this.consumer.onSuccess(cb);
    return this;
  }

  public onBatchError(cb: FailedUploadCallback) {
    this.consumer.onError(cb);
    return this;
  }

  public batch() {
    return this.internalPromise();
  }
}
