import {FieldModel, FieldTypes} from '@coveord/platform-client';

export class FieldBuilder extends Map<string, FieldTypes> {
  constructor() {
    super();
  }

  public concat(fieldBuilder: FieldBuilder) {
    fieldBuilder.forEach((type, name) => {
      this.set(name, type);
    });
  }

  public marshal(): FieldModel[] {
    const fieldModels: FieldModel[] = [];
    this.forEach((fieldType, fieldName) => {
      fieldModels.push({
        name: fieldName,
        type: fieldType,
      });
    });

    return fieldModels;
  }
}
