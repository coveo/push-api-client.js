import PlatformClient, {FieldModel, FieldTypes} from '@coveord/platform-client';
import {DocumentBuilder} from '..';
import {FieldBuilder} from './fieldBuilder';
import {Inconsistencies} from './inconsistencies';

type FieldTypeDict = {[key in FieldTypes]?: number};
type TypeOccurence = [fieldType: string, occurence: number];

export type FieldAnalyserReport = {
  fields: FieldModel[];
  inconsistencies: Inconsistencies;
};

export class FieldAnalyser {
  private static fieldTypePrecedence = ['DOUBLE', 'STRING'];
  private fieldInconsistencies: Inconsistencies;
  private missingFieldsFromOrg: Record<string, FieldTypeDict>;
  private existingFields: string[] | undefined;

  public constructor(private platformClient: PlatformClient) {
    this.fieldInconsistencies = new Inconsistencies();
    this.missingFieldsFromOrg = {};
  }

  public async add(batch: DocumentBuilder[]) {
    const existingFields = await this.ensureExistingFields();

    batch.flatMap((doc: DocumentBuilder) => {
      const documentMetadata = Object.entries({...doc.build().metadata});

      for (const [metadataKey, metadataValue] of documentMetadata) {
        if (existingFields.includes(metadataKey)) {
          continue;
        }
        const metadataType = this.getValue(metadataValue);
        if (this.missingFieldsFromOrg[metadataKey]) {
          // Possible metadata inconsitency
          let fieldType = this.missingFieldsFromOrg[metadataKey][metadataType];
          this.missingFieldsFromOrg[metadataKey][metadataType] = fieldType
            ? ++fieldType
            : 1;
        } else {
          this.missingFieldsFromOrg[metadataKey] = {[metadataType]: 1};
        }
      }
    });
    return this;
  }

  public report(): FieldAnalyserReport {
    const fieldBuilder = this.getFieldTypes();

    return {
      fields: fieldBuilder.marshal(),
      inconsistencies: this.fieldInconsistencies,
    };
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

    Object.entries(this.missingFieldsFromOrg).map(
      ([fieldName, fieldTypeDict]) => {
        this.storePossibleTypeInconsistencies(fieldName, fieldTypeDict);
        const fieldType = this.getMostProbableType(fieldTypeDict);
        fieldBuilder.add(fieldName, fieldType);
      }
    );

    return fieldBuilder;
  }

  private storePossibleTypeInconsistencies(
    fieldName: string,
    fieldTypeDict: FieldTypeDict
  ) {
    const typePossibilities = Object.keys(fieldTypeDict) as FieldTypes[];
    if (typePossibilities.length > 1) {
      this.fieldInconsistencies.add(fieldName, typePossibilities);
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
}
