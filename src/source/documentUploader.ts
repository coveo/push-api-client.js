import PlatformClient from '@coveo/platform-client';
import {FieldAnalyser} from '..';
import {APICore} from '../APICore';
import {DocumentBuilder} from '../documentBuilder';
import {createFieldsFromReport} from '../fieldAnalyser/fieldUtils';
import {noop} from '../help/function';
import {
  BatchUpdateDocuments,
  BatchUpdateDocumentsFromFiles,
  BatchUpdateDocumentsOptions,
} from '../interfaces';
import {UploadStrategy} from '../uploadStrategy';
import {BuiltInTransformers} from '../validation/transformers/transformer';
import {BatchUploadDocumentsFromFilesReturn} from './batchUploadDocumentsFromFile';

const defaultBatchOptions: Required<BatchUpdateDocumentsOptions> = {
  createFields: true,
};
const defaultBatchFromFileOptions: Required<BatchUpdateDocumentsFromFiles> = {
  ...defaultBatchOptions,
  fieldNameTransformer: BuiltInTransformers.identity,
  maxConcurrent: 10,
  callback: noop,
};

export async function uploadDocument(
  platformClient: PlatformClient,
  docBuilder: DocumentBuilder,
  addURL: URL,
  api: APICore,
  options?: BatchUpdateDocumentsOptions
) {
  const {createFields}: Required<BatchUpdateDocumentsOptions> = {
    ...defaultBatchFromFileOptions,
    ...options,
  };
  if (createFields) {
    const analyser = new FieldAnalyser(platformClient);
    await analyser.add([docBuilder]);
    const report = analyser.report();
    await createFieldsFromReport(platformClient, report);
  }

  const doc = docBuilder.build();
  addURL.searchParams.append('documentId', doc.uri);
  return api.put(addURL.toString(), docBuilder.marshal(), false);
}

export async function uploadBatch(
  platformClient: PlatformClient,
  strategy: UploadStrategy,
  batch: BatchUpdateDocuments,
  options?: BatchUpdateDocumentsOptions
): Promise<Response> {
  const {createFields}: BatchUpdateDocumentsOptions = {
    ...defaultBatchOptions,
    ...options,
  };
  if (createFields) {
    const analyser = new FieldAnalyser(platformClient);
    await analyser.add(batch.addOrUpdate);
    const report = analyser.report();
    await createFieldsFromReport(platformClient, report);
  }
  await strategy.preUpload?.();
  const res = await strategy.upload(batch);
  await strategy.postUpload?.();

  return res;
}

export function uploadBatchFromFile(
  platformClient: PlatformClient,
  strategy: UploadStrategy,
  filesOrDirectories: string[],
  options?: BatchUpdateDocumentsFromFiles
) {
  const opts: Required<BatchUpdateDocumentsFromFiles> = {
    ...defaultBatchFromFileOptions,
    ...options,
  };
  return new BatchUploadDocumentsFromFilesReturn(
    platformClient,
    strategy,
    filesOrDirectories,
    opts
  );
}
