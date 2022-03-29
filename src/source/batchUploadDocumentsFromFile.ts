import PlatformClient from '@coveord/platform-client';
import {FieldTypeInconsistencyError} from '../errors/fieldErrors';
import {getAllJsonFilesFromEntries} from '../help/file';
import {FileConsumer} from '../help/fileConsumer';
import {
  BatchUpdateDocuments,
  BatchUpdateDocumentsFromFiles,
  FailedUploadCallback,
  FieldAnalyser,
  SuccessfulUploadCallback,
} from '../index';
import {createFields as create} from '../fieldAnalyser/fieldUtils';
import type {UploadStrategy} from '../uploadStrategy';
import {parseAndGetDocumentBuilderFromJSONDocument} from '../validation/parseFile';

export class BatchUploadDocumentsFromFiles {
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
      (batch: BatchUpdateDocuments) => strategy.uploadBatch(batch),
      {maxConcurrent}
    );

    this.internalPromise = (async () => {
      const files = getAllJsonFilesFromEntries(filesOrDirectories);
      if (createFields) {
        const analyser = new FieldAnalyser(platformClient);
        for (const filePath of files.values()) {
          const docBuilders =
            parseAndGetDocumentBuilderFromJSONDocument(filePath);
          await analyser.add(docBuilders);
        }
        const {fields, inconsistencies} = analyser.report();

        if (inconsistencies.size > 0) {
          throw new FieldTypeInconsistencyError(inconsistencies);
        }
        await create(platformClient, fields);
      }
      await this.consumer.consume(files);
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
