import PlatformClient, {FieldTypes} from '@coveord/platform-client';
import {BatchUpdateDocuments, DocumentBuilder} from '..';

type fieldTypeDict = {[key in FieldTypes]?: number};
type typeOccurence = [fieldType: string, occurence: number];
export class FieldAnalyser {
  private static fieldTypePrecedence = ['DOUBLE', 'STRING'];
  private inconsistentFields: Record<string, FieldTypes[]> = {};

  public constructor(private platformClient: PlatformClient) {}
  public async createMissingFieldsFromBatch(batch: BatchUpdateDocuments) {
    const alreadyCreatedFields = await this.listAllFieldsFromOrg();
    const missingFieldsFromOrg = this.getMissingFieldsFromOrg(
      batch,
      alreadyCreatedFields
    );
    const fieldsToCreate = this.getFieldsToCreate(missingFieldsFromOrg);
    return this.createFields(fieldsToCreate);
  }

  private async listAllFieldsFromOrg(): Promise<string[]> {
    // TODO: CDX-836
    throw new Error('Method not implemented.');
  }

  private createFields(_fields: Record<string, FieldTypes>) {
    // TODO: CDX-835
    throw new Error('Method not implemented.');
  }

  private getMissingFieldsFromOrg(
    batch: BatchUpdateDocuments,
    alreadyCreatedFields: string[]
  ): Record<string, fieldTypeDict> {
    const missingFieldsFromOrg: Record<string, fieldTypeDict> = {};

    batch.addOrUpdate.flatMap((doc: DocumentBuilder) => {
      const documentMetadata = Object.entries({...doc.build().metadata});

      for (const [metadataKey, metadataValue] of documentMetadata) {
        if (alreadyCreatedFields.includes(metadataKey)) {
          continue;
        }
        const metadataType = this.getValue(metadataValue);
        if (missingFieldsFromOrg[metadataKey]) {
          // Possible metadata inconsistency
          let fieldType = missingFieldsFromOrg[metadataKey][metadataType];
          missingFieldsFromOrg[metadataKey][metadataType] = fieldType
            ? ++fieldType
            : 1;
        } else {
          missingFieldsFromOrg[metadataKey] = {[metadataType]: 1};
        }
      }
    });

    return missingFieldsFromOrg;
  }

  private getFieldsToCreate(
    missingFieldsFromOrg: Record<string, fieldTypeDict>
  ): Record<string, FieldTypes> {
    const fieldsToCreate: Record<string, FieldTypes> = {};

    Object.entries(missingFieldsFromOrg).map(([fieldName, fieldTypeDict]) => {
      this.storePossibleTypeInconsistencies(fieldName, fieldTypeDict);
      const fieldType = this.getMostProbableType(fieldTypeDict);
      fieldsToCreate[fieldName] = fieldType;
    });

    this.warnAboutInconsistentFields();

    return fieldsToCreate;
  }

  private storePossibleTypeInconsistencies(
    fieldName: string,
    fieldTypeDict: fieldTypeDict
  ) {
    const typePossibilities = Object.keys(fieldTypeDict) as FieldTypes[];
    if (typePossibilities.length > 1) {
      this.inconsistentFields[fieldName] = typePossibilities;
    }
  }

  private getMostProbableType(field: fieldTypeDict): FieldTypes {
    const [fieldType] = Object.entries(field).reduce((previous, current) => {
      if (current[1] > previous[1]) {
        return current;
      } else if (current[1] < previous[1]) {
        return previous;
      } else {
        return [current, previous].sort(this.typeCompare)[0];
      }
    });
    return fieldType as FieldTypes;
  }

  private typeCompare(field1: typeOccurence, field2: typeOccurence): number {
    const precedence = (field: typeOccurence) =>
      FieldAnalyser.fieldTypePrecedence.indexOf(field[0]);
    if (precedence(field1) < precedence(field2)) {
      return 1;
    }
    if (precedence(field1) > precedence(field2)) {
      return -1;
    }
    return 0;
  }

  private getValue(obj: unknown): FieldTypes {
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

  private warnAboutInconsistentFields() {
    Object.entries(this.inconsistentFields).map(([fieldName, types]) => {
      console.log(
        `Inconsistency detected with the metadata "${fieldName}". Possible types are: ${types
          .sort()
          .join(', ')}`
      );
    });

    // TODO: CDX-836: Request user intervention during field type inconsistency
  }
}
