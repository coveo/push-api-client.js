import {FieldTypes} from '@coveord/platform-client';
import {FieldStore} from './fieldStore';

describe('FieldStore', () => {
  let store: FieldStore;

  beforeEach(() => {
    store = new FieldStore();
  });

  it.each([
    // Mandatory
    {
      title: 'convert to lower case',
      field: 'UpperCaseField',
      expectation: 'uppercasefield',
    },
    {
      title: 'replace non special characters with underscores',
      field: 'field with spaces-and-dashes',
      expectation: 'field_with_spaces_and_dashes',
    },
    {
      title: 'start with a letter',
      field: '0Starting_With_A_Number',
      expectation: 'starting_with_a_number',
    },
    // Optional: to prevent having ugly fields
    {
      title: 'not contain consecutive underscores',
      field: 'consecutive_^&*_chars',
      expectation: 'consecutive_chars',
    },
    {
      title: 'not start with an underscore',
      field: 'åß∂•leading_special_chars',
      expectation: 'leading_special_chars',
    },
    {
      title: 'not end with an underscore',
      field: 'trailing_special_char)^&@',
      expectation: 'trailing_special_char',
    },
  ])('should $title', ({field, expectation}) => {
    store.set(field, FieldTypes.STRING);
    const formattedField = store.invalidFields.get(field); // TODO: this is not nice. should find a better interface to get an invalid entry
    expect(formattedField).toEqual(expectation);
  });
});
