import PlatformClient, {FieldModel, FieldTypes} from '@coveord/platform-client';
import {DocumentBuilder, MetadataValue} from '..';
import {listAllFieldsFromOrg} from './utils';
import {FieldBuilder} from './fieldBuilder';
import {Inconsistencies} from './inconsistencies';
import performance from '../performances/performance';

type FieldTypeMap = Map<FieldTypes, number>;
type TypeOccurence = [fieldType: FieldTypes, occurence: number];

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

    performance.inspect();
    batch.flatMap((doc: DocumentBuilder) => {
      const documentMetadata = Object.entries({...doc.build().metadata});
      performance.inspect();

      for (const [metadataKey, metadataValue] of documentMetadata) {
        if (existingFields.includes(metadataKey)) {
          performance.inspect();
          continue;
        }
        performance.inspect();
        this.storeMetadata(metadataKey, metadataValue);
        performance.inspect();
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
    performance.inspect();

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

  private async ensureExistingFields(): Promise<string[]> {
    if (this.existingFields === undefined) {
      this.existingFields = await listAllFieldsFromOrg(this.platformClient);
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

  private getMostProbableType(field: FieldTypeMap): FieldTypes {
    let typeOccurence: TypeOccurence = [FieldTypes.STRING, -1];
    field.forEach((occurence, fieldType) => {
      if (typeOccurence[1] < occurence) {
        typeOccurence = [fieldType, occurence];
      } else if (typeOccurence[1] === occurence) {
        typeOccurence[0] = this.getTypeWithMostPrecedence(
          fieldType,
          typeOccurence[0]
        );
      }
    });

    return typeOccurence[0];
  }

  private getTypeWithMostPrecedence(a: FieldTypes, b: FieldTypes) {
    return [a, b].sort(this.typeCompare)[0];
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
