import {FieldModel, FieldTypes} from '@coveord/platform-client';
import {FieldNormalizationCollisionError} from '../errors/fieldErrors';

export class NormalizedFieldStore extends Map<string, string> {
  public set(key: string, value: string) {
    super.set(key, value);
    this.ensureValueUniqueness(key, value);
    return this;
  }

  private ensureValueUniqueness(key: string, normalizedKey: string) {
    for (const [k, v] of this.entries()) {
      if (k !== key && v === normalizedKey) {
        throw new FieldNormalizationCollisionError(key, k, normalizedKey);
      }
    }
  }
}

export class FieldStore extends Map<string, FieldTypes> {
  private _normalized: NormalizedFieldStore;

  public constructor() {
    super();
    this._normalized = new NormalizedFieldStore();
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
        name: this.normalize(fieldName),
        type: fieldType,
      });
    });

    return fieldModels;
  }

  public set(key: string, value: FieldTypes) {
    super.set(key, value);
    if (!this.isFieldNameValid(key)) {
      this._normalized.set(key, this.normalize(key));
    }
    return this;
  }

  public get normalized() {
    return Array.from(this._normalized.entries());
  }

  private isFieldNameValid(fieldName: string): boolean {
    const allowedChar = new RegExp('^[a-z]+[a-z0-9_]*$');
    return allowedChar.test(fieldName);
  }

  private normalize(fieldName: string): string {
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
