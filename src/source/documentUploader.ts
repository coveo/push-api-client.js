import PlatformClient from '@coveord/platform-client';
import axios, {AxiosRequestConfig, AxiosResponse} from 'axios';
import {FieldAnalyser} from '..';
import {DocumentBuilder} from '../documentBuilder';
import {FieldTypeInconsistencyError} from '../errors/fieldErrors';
import {createFields as create} from '../fieldAnalyser/fieldUtils';
import {
  BatchUpdateDocuments,
  BatchUpdateDocumentsFromFiles,
  BatchUpdateDocumentsOptions,
} from '../interfaces';
import {UploadStrategy} from '../uploadStrategy';
import {BatchUploadDocumentsFromFilesReturn} from './batchUploadDocumentsFromFile';

const defaultBatchOptions: Required<BatchUpdateDocumentsOptions> = {
  createFields: true,
};

const defaultBatchFromFileOptions: Required<BatchUpdateDocumentsFromFiles> = {
  ...defaultBatchOptions,
  maxConcurrent: 10,
};

export async function uploadDocument(
  platformClient: PlatformClient,
  docBuilder: DocumentBuilder,
  addURL: URL,
  documentsAxiosConfig: AxiosRequestConfig,
  options?: BatchUpdateDocumentsFromFiles
) {
  const {createFields}: Required<BatchUpdateDocumentsFromFiles> = {
    ...defaultBatchFromFileOptions,
    ...options,
  };
  if (createFields) {
    const analyser = new FieldAnalyser(platformClient);
    await analyser.add([docBuilder]);
    const {fields, inconsistencies} = analyser.report();
    if (inconsistencies.size > 0) {
      throw new FieldTypeInconsistencyError(inconsistencies);
    }

    await create(platformClient, fields);
  }

  const doc = docBuilder.build();
  addURL.searchParams.append('documentId', doc.uri);
  return axios.put(
    addURL.toString(),
    docBuilder.marshal(),
    documentsAxiosConfig
  );
}

export async function uploadBatch(
  platformClient: PlatformClient,
  strategy: UploadStrategy,
  batch: BatchUpdateDocuments,
  options?: BatchUpdateDocumentsOptions
): Promise<AxiosResponse> {
  const {createFields}: BatchUpdateDocumentsOptions = {
    ...defaultBatchOptions,
    ...options,
  };
  if (createFields) {
    const analyser = new FieldAnalyser(platformClient);
    await analyser.add(batch.addOrUpdate);
    const {fields, inconsistencies} = analyser.report();

    if (inconsistencies.size > 0) {
      throw new FieldTypeInconsistencyError(inconsistencies);
    }

    await create(platformClient, fields);
  }
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
