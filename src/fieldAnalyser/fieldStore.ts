import {FieldModel, FieldTypes} from '@coveord/platform-client';

export class FieldStore extends Map<string, FieldTypes> {
  public concat(fieldBuilder: FieldStore) {
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
