import PlatformClient from '@coveo/platform-client';
import {createFieldsFromReport} from '../fieldAnalyser/fieldUtils';
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
import {parseAndGetDocumentBuilderFromJSONDocument} from '../validation/parseFile';

export class BatchUploadDocumentsFromFilesReturn {
  private internalPromise: () => Promise<void>;
  private consumer: FileConsumer;

  constructor(
    platformClient: PlatformClient,
    strategy: UploadStrategy,
    filesOrDirectories: string[],
    options: Required<BatchUpdateDocumentsFromFiles>
  ) {
    this.consumer = new FileConsumer(
      (batch: BatchUpdateDocuments) => strategy.upload(batch),
      options
    );

    this.internalPromise = (async () => {
      let expectedDocumentCount = 0;
      const files = getAllJsonFilesFromEntries(filesOrDirectories);
      await strategy.preUpload?.();

      const analyser = new FieldAnalyser(platformClient);
      for (const filePath of files.values()) {
        const docBuilders = await parseAndGetDocumentBuilderFromJSONDocument(
          filePath,
          options
        );
        expectedDocumentCount += docBuilders.length;
        if (options.createFields) {
          await analyser.add(docBuilders);
        }
      }

      if (options.createFields) {
        const report = analyser.report();
        await createFieldsFromReport(platformClient, report);
      }

      this.consumer.expectedDocumentCount = expectedDocumentCount;
      await this.consumer.consume(files, options);
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
