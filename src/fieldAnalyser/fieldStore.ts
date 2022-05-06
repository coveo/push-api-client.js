import {FieldModel, FieldTypes} from '@coveord/platform-client';

export class FieldStore extends Map<string, FieldTypes> {
  private _invalidFields: Map<string, string> = new Map();

  public concat(fieldBuilder: FieldStore) {
    fieldBuilder.forEach((type, name) => {
      this.set(name, type);
    });
  }

  public marshal(): FieldModel[] {
    const fieldModels: FieldModel[] = [];
    this.forEach((fieldType, fieldName) => {
      fieldModels.push({
        name: this.formatIntoValidFieldName(fieldName),
        type: fieldType,
      });
    });

    return fieldModels;
  }

  public set(key: string, value: FieldTypes) {
    super.set(key, value);
    if (!this.isFieldNameValid(key)) {
      this._invalidFields.set(key, this.formatIntoValidFieldName(key));
    }
    return this;
  }

  // TODO: not sure that is the cleanest way to store this
  public get invalidFields() {
    return this._invalidFields;
  }

  private isFieldNameValid(fieldName: string): boolean {
    const allowedChar = new RegExp('^[a-z]+[a-z0-9_]*$');
    return allowedChar.test(fieldName);
  }

  private formatIntoValidFieldName(fieldName: string): string {
    fieldName = fieldName
      // Extract alpha numeric only
      .replace(/[^a-z0-9]/gi, '_')
      // Remove any leading number or underscore
      .replace(/^[0-9_]+/g, '')
      // Remove consecutive underscores
      .replace(/_{2,}/g, '_')
      // Remove any trailing underscore
      .replace(/_$/g, '');

    // TODO: detect collision
    return fieldName.toLowerCase();
  }
}
