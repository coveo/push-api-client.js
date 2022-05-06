import PlatformClient from '@coveord/platform-client';
import {AxiosResponse} from 'axios';
import {FieldAnalyser} from '..';
import {BatchUpdateDocuments, BatchUpdateDocumentsOptions} from '../interfaces';
import {UploadStrategy} from '../uploadStrategy';

const defaultUploadBatchOptions: Required<BatchUpdateDocumentsOptions> = {
  createFields: true,
  formatInvalidFields: false,
};

export async function uploadBatch(
  platformClient: PlatformClient,
  strategy: UploadStrategy,
  batch: BatchUpdateDocuments,
  options?: BatchUpdateDocumentsOptions
): Promise<AxiosResponse> {
  const opt = {...defaultUploadBatchOptions, ...options};
  if (opt.createFields) {
    const analyser = new FieldAnalyser(platformClient);
    await analyser.add(batch.addOrUpdate);
    await analyser.report().createMissingFields(opt);
  }
  const res = await strategy.upload(batch);
  await strategy.postUpload?.();

  return res;
}
