import PlatformClient, {FieldModel, FieldTypes} from '@coveord/platform-client';
import {DocumentBuilder, MetadataValue} from '..';
import {FieldBuilder} from './fieldBuilder';
import {Inconsistencies} from './inconsistencies';

type FieldTypeMap = Map<FieldTypes, number>;

export type FieldAnalyserReport = {
  fields: FieldModel[];
  inconsistencies: Inconsistencies;
};

/**
 * Analyse documents to detect type inconsistencies and missing fields in your index.
 *
 */
export class FieldAnalyser {
  private static fieldTypePrecedence = ['DOUBLE', 'STRING'];
  private inconsistencies: Inconsistencies;
  private missingFields: Map<string, FieldTypeMap>;
  private existingFields: string[] | undefined;

  public constructor(private platformClient: PlatformClient) {
    this.inconsistencies = new Inconsistencies();
    this.missingFields = new Map();
  }

  /**
   * Adds a batch of document builders to the analyser
   * This method can be called as many time as needed as it will take into consideration document builders previously added.
   *
   * @param {DocumentBuilder[]} batch
   * @return {*}
   */
  public async add(batch: DocumentBuilder[]) {
    const existingFields = await this.ensureExistingFields();

    batch.flatMap((doc: DocumentBuilder) => {
      const documentMetadata = Object.entries({...doc.build().metadata});

      for (const [metadataKey, metadataValue] of documentMetadata) {
        if (existingFields.includes(metadataKey)) {
          continue;
        }
        this.storeMetadata(metadataKey, metadataValue);
      }
    });
    return this;
  }

  /**
   * Returns the analyser report containing the fields to create as well as the type inconsistencies in the documents
   *
   * @return {*}  {FieldAnalyserReport}
   */
  public report(): FieldAnalyserReport {
    const fieldBuilder = this.getFieldTypes();

    return {
      fields: fieldBuilder.marshal(),
      inconsistencies: this.inconsistencies,
    };
  }

  private storeMetadata(metadataKey: string, metadataValue: MetadataValue) {
    const initialTypeCount = 1;
    const metadataType = this.getGuessedTypeFromValue(metadataValue);
    const fieldTypeMap = this.missingFields.get(metadataKey);

    if (fieldTypeMap) {
      // Possible metadata inconsitency
      const fieldTypeCount = fieldTypeMap.get(metadataType);
      fieldTypeMap.set(
        metadataType,
        fieldTypeCount ? fieldTypeCount + 1 : initialTypeCount
      );
    } else {
      const newFieldTypeMap = new Map().set(metadataType, initialTypeCount);
      this.missingFields.set(metadataKey, newFieldTypeMap);
    }
  }

  private async listAllFieldsFromOrg(
    page = 0,
    fields: FieldModel[] = []
  ): Promise<string[]> {
    const list = await this.platformClient.field.list({
      page,
      perPage: 1000,
    });

    fields.push(...list.items);

    if (page < list.totalPages - 1) {
      return this.listAllFieldsFromOrg(page + 1, fields);
    }

    return fields.map(({name}) => `${name}`);
  }

  private async ensureExistingFields(): Promise<string[]> {
    if (this.existingFields === undefined) {
      this.existingFields = await this.listAllFieldsFromOrg();
    }
    return this.existingFields;
  }

  private getFieldTypes(): FieldBuilder {
    const fieldBuilder = new FieldBuilder();

    this.missingFields.forEach((fieldTypeMap, fieldName) => {
      this.storePossibleTypeInconsistencies(fieldName, fieldTypeMap);
      const fieldType = this.getMostProbableType(fieldTypeMap);
      fieldBuilder.add(fieldName, fieldType);
    });

    return fieldBuilder;
  }

  private storePossibleTypeInconsistencies(
    fieldName: string,
    fieldTypeMap: FieldTypeMap
  ) {
    if (fieldTypeMap.size > 1) {
      const fieldTypes = Array.from(fieldTypeMap.keys());
      this.inconsistencies.add(fieldName, fieldTypes);
    }
  }

  public getMostProbableType(field: FieldTypeMap): FieldTypes {
    const sortedType = Array.from(field.entries()).sort(
      (a: [FieldTypes, number], b: [FieldTypes, number]) => {
        const countDiff = b[1] - a[1];
        return countDiff ? countDiff : this.typeCompare(a[0], b[0]);
      }
    );
    return sortedType[0][0];
  }

  private typeCompare(field1: FieldTypes, field2: FieldTypes): number {
    const precedence = (field: FieldTypes) =>
      FieldAnalyser.fieldTypePrecedence.indexOf(field);
    if (precedence(field1) < precedence(field2)) {
      return 1;
    }
    if (precedence(field1) > precedence(field2)) {
      return -1;
    }
    return 0;
  }

  private getGuessedTypeFromValue(obj: unknown): FieldTypes {
    switch (typeof obj) {
      case 'number':
        return this.getSpecificNumericType(obj);
      case 'string':
        return FieldTypes.STRING;
      default:
        return FieldTypes.STRING;
    }
  }

  private getSpecificNumericType(_number: number): FieldTypes {
    // TODO: CDX-838 Support LONG, LONG32 and DATE types
    return FieldTypes.DOUBLE;
  }
}
