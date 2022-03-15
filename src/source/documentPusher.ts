import PlatformClient from '@coveord/platform-client';
import {FieldAnalyser} from '..';
import {FieldTypeInconsistencyError} from '../errors/fieldErrors';
import {createFields} from '../fieldAnalyser/fieldUtils';
import {getAllJsonFilesFromEntries} from '../help';
import {
  BatchUpdateDocuments,
  BatchUpdateDocumentsFromFiles,
} from '../interfaces';
import {Strategy} from '../uploadStrategy';
import {parseAndGetDocumentBuilderFromJSONDocument} from '../validation/parseFile';

// TODO: rename
export class DocumentPusher {
  public constructor(private platformClient: PlatformClient) {}

  public async singleBatch(
    strategy: Strategy,
    batch: BatchUpdateDocuments,
    createFields = true
  ) {
    if (createFields) {
      const analyser = new FieldAnalyser(this.platformClient);
      await analyser.add(batch.addOrUpdate);
      await this.createFields(analyser);
    }
    return strategy.doTheMagicSingleBatch(batch);
  }

  public async multipleBatches(
    strategy: Strategy,
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
      const analyser = new FieldAnalyser(this.platformClient);
      for (const filePath of files.values()) {
        const docBuilders =
          parseAndGetDocumentBuilderFromJSONDocument(filePath);
        await analyser.add(docBuilders);
      }
      await this.createFields(analyser);
    }

    return strategy.doTheMagic(files, {maxConcurrent});
  }

  private async createFields(analyser: FieldAnalyser) {
    const {fields, inconsistencies} = analyser.report();

    if (inconsistencies.size > 0) {
      throw new FieldTypeInconsistencyError(inconsistencies);
    }
    await createFields(this.platformClient, fields);
  }
}
