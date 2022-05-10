import {FieldTypes} from '@coveord/platform-client';
import {FieldNormalizationCollisionError} from '../errors/fieldErrors';
import {FieldStore} from './fieldStore';

describe('FieldStore', () => {
  let store: FieldStore;

  beforeEach(() => {
    store = new FieldStore();
  });

  it('should return the formatted field models', () => {
    const store = new FieldStore();
    store
      .set('Crazy=FiElD!', FieldTypes.DOUBLE)
      .set('0In$An3<>Field!!!', FieldTypes.LONG);

    const fieldModels = store.marshal();
    expect(fieldModels).toEqual([
      {
        name: 'crazy_field',
        type: 'DOUBLE',
      },
      {
        name: 'in_an3_field',
        type: 'LONG',
      },
    ]);
  });

  it.each([
    // Mandatory rules: Rules imposed by the Platform
    {
      title: 'convert to lower case',
      initialField: 'UpperCaseField',
      expectation: 'uppercasefield',
    },
    {
      title: 'replace non special characters with underscores',
      initialField: 'field with spaces-and-dashes',
      expectation: 'field_with_spaces_and_dashes',
    },
    {
      title: 'start with a letter',
      initialField: '0Starting_With_A_Number',
      expectation: 'starting_with_a_number',
    },
    // Additional rules: Rules to prevent having ugly formatted fields in the index.
    // Not mandatory by the platform
    {
      title: 'not contain consecutive underscores',
      initialField: 'consecutive_^&*_chars',
      expectation: 'consecutive_chars',
    },
    {
      title: 'not start with an underscore',
      initialField: 'åß∂•leading_special_chars',
      expectation: 'leading_special_chars',
    },
    {
      title: 'not end with an underscore',
      initialField: 'trailing_special_char)^&@',
      expectation: 'trailing_special_char',
    },
  ])('should $title', ({initialField, expectation}) => {
    store.set(initialField, FieldTypes.STRING);
    const formattedField = store.normalized[0][1];
    expect(formattedField).toEqual(expectation);
  });

  describe('when there are field collisions', () => {
    it('should throw an error', () => {
      const store = new FieldStore();
      const addToStore = () => {
        store
          .set('Some-field', FieldTypes.STRING)
          .set('some:field', FieldTypes.STRING);
      };
      expect(addToStore).toThrow(FieldNormalizationCollisionError);
    });
  });
});
