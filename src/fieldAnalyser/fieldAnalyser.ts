import PlatformClient, {FieldModel, FieldTypes} from '@coveord/platform-client';
import {BatchUpdateDocuments, DocumentBuilder} from '..';

type FieldTypeDict = {[key in FieldTypes]?: number};
type TypeOccurence = [fieldType: string, occurence: number];

export class FieldAnalyser {
  private static fieldTypePrecedence = ['DOUBLE', 'STRING'];
  private inconsitentFields: Record<string, FieldTypes[]> = {};

  public constructor(private platformClient: PlatformClient) {}

  public async getFieldsToCreate(batch: BatchUpdateDocuments): Promise<{
    fields: Record<string, FieldTypes>;
    inconsistencies: Record<string, FieldTypes[]>;
  }> {
    const existingFields = await this.listAllFieldsFromOrg();
    const fieldsToCreate = this.getMissingFieldsFromOrg(batch, existingFields);

    return {
      fields: this.getFieldTypes(fieldsToCreate),
      inconsistencies: this.inconsitentFields,
    };
  }

  public createFields(_fieldDict: Record<string, FieldTypes>) {
    // TODO: CDX-835
    throw new Error('Method not implemented.');
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

  private getMissingFieldsFromOrg(
    batch: BatchUpdateDocuments,
    alreadyCreatedFields: string[]
  ): Record<string, FieldTypeDict> {
    const missingFieldsFromOrg: Record<string, FieldTypeDict> = {};

    batch.addOrUpdate.flatMap((doc: DocumentBuilder) => {
      const documentMetadata = Object.entries({...doc.build().metadata});

      for (const [metadataKey, metadataValue] of documentMetadata) {
        if (alreadyCreatedFields.includes(metadataKey)) {
          continue;
        }
        const metadataType = this.getValue(metadataValue);
        if (missingFieldsFromOrg[metadataKey]) {
          // Possible metadata inconsitency
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

  private getFieldTypes(
    missingFieldsFromOrg: Record<string, FieldTypeDict>
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
    fieldTypeDict: FieldTypeDict
  ) {
    const typePossibilities = Object.keys(fieldTypeDict) as FieldTypes[];
    if (typePossibilities.length > 1) {
      this.inconsitentFields[fieldName] = typePossibilities;
    }
  }

  private getMostProbableType(field: FieldTypeDict): FieldTypes {
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

  private typeCompare(field1: TypeOccurence, field2: TypeOccurence): number {
    const precedence = (field: TypeOccurence) =>
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
    Object.entries(this.inconsitentFields).map(([fieldName, types]) => {
      console.log(
        `Inconsistency detected with the metadata "${fieldName}". Possible types are: ${types
          .sort()
          .join(', ')}`
      );
    });

    // TODO: CDX-836: Request user intervention during field type inconsistency
  }
}
