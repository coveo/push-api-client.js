import PlatformClient from '@coveord/platform-client';
import {
  FieldTypeInconsistencyError,
  UnsupportedFieldError,
} from '../errors/fieldErrors';
import {BatchUpdateDocumentsOptions} from '../interfaces';
import {FieldStore} from './fieldStore';
import {createFields} from './fieldUtils';
import {Inconsistencies} from './inconsistencies';

// TODO: not sure if this class should be expose if someone uses the fieldAnalyser class. TO TEST!
export class FieldAnalyserReport {
  public constructor(
    private platformClient: PlatformClient,
    private missingFields: FieldStore,
    public readonly inconsistencies: Inconsistencies
  ) {}

  /**
   * TODO: better doc
   * All the fields to be created. Including the formatted ones
   */
  public get fields() {
    this.removeInconsistentFields();
    return this.missingFields.marshal();
  }

  /**
   * TODO: better doc
   * Fields that had to be formatted in order to be created
   */
  public get formattedFields() {
    // TODO: use the same naming
    return this.missingFields.invalidFields;
  }

  /**
   * TODO: document this method saying the fields will be created in the destination organization
   *
   * @param {Pick<BatchUpdateDocumentsOptions, 'formatInvalidFields'>} options
   */
  public async createMissingFields(
    options?: Pick<BatchUpdateDocumentsOptions, 'formatInvalidFields'>
  ) {
    if (this.inconsistencies.size > 0) {
      throw new FieldTypeInconsistencyError(this.inconsistencies);
    }
    if (
      !options?.formatInvalidFields &&
      this.missingFields.invalidFields.size > 0
    ) {
      throw new UnsupportedFieldError(this.missingFields.invalidFields);
    }
    await createFields(this.platformClient, this.fields);
  }

  private removeInconsistentFields() {
    for (const fieldname of this.inconsistencies.keys()) {
      this.missingFields.delete(fieldname);
    }
  }
}
