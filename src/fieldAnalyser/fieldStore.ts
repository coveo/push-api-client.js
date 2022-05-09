import {FieldModel, FieldTypes} from '@coveord/platform-client';
import {FieldCollisionError} from '../errors/fieldErrors';

export class FormattedFieldStore extends Map<string, string> {
  public set(key: string, value: string) {
    super.set(key, value);
    this.ensureValueUniqueness(key, value);
    return this;
  }

  private ensureValueUniqueness(key: string, formattedKey: string) {
    for (const [k, v] of this.entries()) {
      if (k !== key && v === formattedKey) {
        throw new FieldCollisionError(key, k, formattedKey);
      }
    }
  }
}

export class FieldStore extends Map<string, FieldTypes> {
  private _formatted: FormattedFieldStore;

  public constructor() {
    super();
    this._formatted = new FormattedFieldStore();
  }

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
      this._formatted.set(key, this.formatIntoValidFieldName(key));
    }
    return this;
  }

  public get formatted() {
    return Array.from(this._formatted.entries());
  }

  private isFieldNameValid(fieldName: string): boolean {
    const allowedChar = new RegExp('^[a-z]+[a-z0-9_]*$');
    return allowedChar.test(fieldName);
  }

  private formatIntoValidFieldName(fieldName: string): string {
    fieldName = fieldName
      // Replace non-alpha numeric with underscores
      .replace(/[^a-z0-9]/gi, '_')
      // Remove any leading number or underscore
      .replace(/^[0-9_]+/g, '')
      // Remove consecutive underscores
      .replace(/_{2,}/g, '_')
      // Remove any trailing underscore
      .replace(/_$/g, '');

    return fieldName.toLowerCase();
  }
}
