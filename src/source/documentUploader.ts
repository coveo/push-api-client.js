import PlatformClient from '@coveord/platform-client';
import {FieldAnalyser} from '..';
import {FieldTypeInconsistencyError} from '../errors/fieldErrors';
import {createFields as create} from '../fieldAnalyser/fieldUtils';
import {BatchUpdateDocuments} from '../interfaces';
import {UploadStrategy} from '../uploadStrategy';

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
