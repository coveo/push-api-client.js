import PlatformClient from '@coveord/platform-client';
import {FieldAnalyser} from '..';
import {FieldTypeInconsistencyError} from '../errors/fieldErrors';
import {createFields as create} from '../fieldAnalyser/fieldUtils';
import {getAllJsonFilesFromEntries} from '../help';
import {
  BatchUpdateDocuments,
  BatchUpdateDocumentsFromFiles,
} from '../interfaces';
import {UploadStrategy} from '../uploadStrategy';
import {parseAndGetDocumentBuilderFromJSONDocument} from '../validation/parseFile';

export async function uploadBatch(
  platformClient: PlatformClient,
  strategy: UploadStrategy,
  batch: BatchUpdateDocuments,
  createFields = true
) {
  if (createFields) {
    const analyser = new FieldAnalyser(platformClient);
    await analyser.add(batch.addOrUpdate);
    const {fields, inconsistencies} = analyser.report();

    if (inconsistencies.size > 0) {
      throw new FieldTypeInconsistencyError(inconsistencies);
    }

    await create(platformClient, fields);
  }
  return strategy.uploadBatch(batch);
}

export async function uploadFiles(
  platformClient: PlatformClient,
  strategy: UploadStrategy,
  filesOrDirectories: string[],
  options?: BatchUpdateDocumentsFromFiles
) {
  const defaultOptions = {
    maxConcurrent: 10,
    createFields: true,
  };
  const {createFields, maxConcurrent} = {
    ...defaultOptions,
    ...options,
  };
  const files = getAllJsonFilesFromEntries(filesOrDirectories);

  if (createFields) {
    const analyser = new FieldAnalyser(platformClient);
    for (const filePath of files.values()) {
      const docBuilders = parseAndGetDocumentBuilderFromJSONDocument(filePath);
      await analyser.add(docBuilders);
    }
    const {fields, inconsistencies} = analyser.report();

    if (inconsistencies.size > 0) {
      throw new FieldTypeInconsistencyError(inconsistencies);
    }

    await create(platformClient, fields);
  }

  return strategy.uploadFiles(files, {maxConcurrent});
}
