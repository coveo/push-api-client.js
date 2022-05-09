import PlatformClient, {FieldModel, FieldTypes} from '@coveord/platform-client';
import {DocumentBuilder, MetadataValue} from '..';
import {listAllFieldsFromOrg} from './fieldUtils';
import {FieldStore} from './fieldStore';
import {Inconsistencies} from './inconsistencies';
import {InvalidPermanentId} from '../errors/fieldErrors';
import {getGuessedTypeFromValue, getMostEnglobingType} from './typeUtils';
import {ensureNecessaryCoveoPrivileges} from '../validation/preconditions/apiKeyPrivilege';
import {writeFieldsPrivilege} from '../validation/preconditions/platformPrivilege';
import {getAllJsonFilesFromEntries} from '../help/file';
import {parseAndGetDocumentBuilderFromJSONDocument} from '../validation/parseFile';

export type FieldAnalyserReport = {
  fields: FieldModel[];
  formattedFields: [string, string][];
  inconsistencies: Inconsistencies;
};

/**
 * Analyse documents to detect type inconsistencies and missing fields in your index.
 *
 */
export class FieldAnalyser {
  private inconsistencies: Inconsistencies;
  private missingFields: FieldStore;
  private existingFields: FieldModel[] | undefined;

  public constructor(private platformClient: PlatformClient) {
    this.inconsistencies = new Inconsistencies();
    this.missingFields = new FieldStore();
  }

  /**
   * Adds a batch of document builders to the analyser to extract all the missing fields that need to be created in the organization.
   * This method can be called as many time as needed as it will take into consideration document builders previously added.
   *
   * @param {DocumentBuilder[]} batch
   * @return {*}
   */
  public async add(batch: DocumentBuilder[]) {
    await ensureNecessaryCoveoPrivileges(
      this.platformClient,
      writeFieldsPrivilege
    );
    const existingFields = await this.ensureExistingFields();

    batch.flatMap((doc: DocumentBuilder) => {
      const documentMetadata = Object.entries({...doc.build().metadata});

      for (const [metadataKey, metadataValue] of documentMetadata) {
        if (existingFields.some((field) => field.name === metadataKey)) {
          continue;
        }
        this.storeMetadata(metadataKey, metadataValue);
      }
    });
    return this;
  }

  /**
   *
   * Adds a list of files to the analyser to extract all the missing fields that need to be created in the organization.
   * This method can be called as many time as needed as it will take into consideration files previously added.
   *
   * @param {string[]} filesOrDirectories
   * @return {*}
   */
  public async addFromFiles(filesOrDirectories: string[]) {
    const files = getAllJsonFilesFromEntries(filesOrDirectories);
    for (const filePath of files.values()) {
      const docBuilders = parseAndGetDocumentBuilderFromJSONDocument(filePath);
      await this.add(docBuilders);
    }
    return this;
  }

  /**
   * Returns the analyser report containing the fields to create as well as the type inconsistencies in the documents
   *
   * @return {*}  {FieldAnalyserReport}
   */
  public report(): FieldAnalyserReport {
    this.ensurePermanentId(this.missingFields);
    this.removeInconsistentFields();

    return {
      fields: this.missingFields.marshal(),
      formattedFields: this.missingFields.formatted,
      inconsistencies: this.inconsistencies,
    };
  }

  private removeInconsistentFields() {
    for (const fieldname of this.inconsistencies.keys()) {
      this.missingFields.delete(fieldname);
    }
  }

  private storeMetadata(metadataKey: string, metadataValue: MetadataValue) {
    const alreadyGuessedType = this.missingFields.get(metadataKey);
    const firstTypeGuess = getGuessedTypeFromValue(metadataValue);

    if (!alreadyGuessedType) {
      this.missingFields.set(metadataKey, firstTypeGuess);
      return;
    }

    const secondTypeGuess = getMostEnglobingType(
      alreadyGuessedType,
      firstTypeGuess
    );

    if (secondTypeGuess) {
      this.missingFields.set(metadataKey, secondTypeGuess);
    } else {
      this.inconsistencies.add(metadataKey, [
        alreadyGuessedType,
        firstTypeGuess,
      ]);
    }
  }

  private async ensureExistingFields(): Promise<FieldModel[]> {
    if (this.existingFields === undefined) {
      this.existingFields = await listAllFieldsFromOrg(this.platformClient);
    }
    return this.existingFields;
  }

  private ensurePermanentId(fieldStore: FieldStore) {
    const permanentid = this.existingFields?.find(
      (field) => field.name === 'permanentid'
    );

    if (permanentid) {
      if (permanentid.type !== FieldTypes.STRING) {
        throw new InvalidPermanentId(permanentid);
      }
    } else {
      fieldStore.set('permanentid', FieldTypes.STRING);
    }
  }
}
