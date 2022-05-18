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
  public static emptyFieldNameReplacer = '<empty field name>';
  public readonly unsupportedFields: [string, string][];
  public constructor(...unsupportedFields: [string, string][]) {
    super();
    this.unsupportedFields = unsupportedFields;
    this.message = `
The following field names are still invalid after transformation:
${this.formattedFieldList}
Field names can only contain lowercase letters (a-z), numbers (0-9), and underscores. Field names must be at least one character long and must start with a lowercase letter.
    `;
  }

  private get formattedFieldList() {
    const replacer = UnsupportedFieldError.emptyFieldNameReplacer;
    return this.unsupportedFields.reduce(
      (prev: string, curr: [string, string]) =>
        (prev += `  • ${curr[0] || replacer} --> ${curr[1] || replacer}\n`),
      ''
    );
  }
}
