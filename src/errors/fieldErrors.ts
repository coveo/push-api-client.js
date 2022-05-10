import {FieldModel} from '@coveord/platform-client';
import {Inconsistencies} from '../fieldAnalyser/inconsistencies';
import {PushApiClientBaseError} from './baseError';

export class FieldTypeInconsistencyError extends PushApiClientBaseError {
  public name = 'Field Type Inconsistency Error';
  public constructor(inconsitencies: Inconsistencies) {
    super();
    this.message = `Inconsistent types detected in the following field${
      inconsitencies.size > 1 ? 's' : ''
    }:`;
    inconsitencies.forEach((typeSet, field) => {
      const inconsistentTypes = [];
      for (const type of typeSet) {
        inconsistentTypes.push(type);
      }
      this.message += `
      ${field}: ${inconsistentTypes.sort().join(', ')}`;
    });

    // TODO: CDX-844: display document with type inconsistencies
    this.message += `
      Make sure to review and fix your document metadata before pushing`;
  }
}

export class InvalidPermanentId extends PushApiClientBaseError {
  public name = 'Invalid permanentId field Error';
  public constructor(field: FieldModel) {
    super(`
The permanentid field detected in the index is not correctly configured.
Expected field type: STRING
Current field type: ${field.type}

You can delete and recreate the permanentid field as a STRING field.
See docs.coveo.com/en/1913 fore more info.
    `);
  }
}
export class UnsupportedFieldError extends PushApiClientBaseError {
  public name = 'Unsupported field Error';
  public constructor(public readonly unsupportedFields: [string, string][]) {
    super(`
The following field names are invalid:
${unsupportedFields.reduce(
  (prev: string, curr: [string, string]) => (prev += `  • ${curr[0]}\n`),
  ''
)}

Field names can only contain lowercase letters (a-z), numbers (0-9), and underscores. The field name must be at least one character long and must start with a lowercase letter.
    `);
  }
}

export class FieldNormalizationCollisionError extends PushApiClientBaseError {
  public name = 'Field Name Collision Error';
  public constructor(fieldA: string, fieldB: string, normalizedField: string) {
    super(`
Both fields ${fieldA} and ${fieldB} cannot be normalized to the same field ${normalizedField}.
Ensure they are different enough to prevent future normalization collisions.
    `);
  }
}
