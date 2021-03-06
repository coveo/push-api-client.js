import {FieldTypes} from '@coveord/platform-client';
import {getGuessedTypeFromValue, getMostEnglobingType} from './typeUtils';

describe('typeUtils', () => {
  const signedIntegerLimit = 0b1111111111111111111111111111111;

  it.each([
    // String
    {value: 'over 9000', type: FieldTypes.STRING},
    // LONG
    {value: 0, type: FieldTypes.LONG},
    {value: -10, type: FieldTypes.LONG},
    {value: signedIntegerLimit, type: FieldTypes.LONG},
    {value: 10.0, type: FieldTypes.LONG},
    // LONG 64
    {value: signedIntegerLimit + 1, type: FieldTypes.LONG_64},
    {value: signedIntegerLimit * -1 - 2, type: FieldTypes.LONG_64},
    // DOUBLE
    {value: 3.14, type: FieldTypes.DOUBLE},
    {value: -1.23, type: FieldTypes.DOUBLE},
    {value: 9.164e-17, type: FieldTypes.DOUBLE},
    {value: -9.1642346778e-175, type: FieldTypes.DOUBLE},
  ])('value $value should be of type $type', ({value, type}) => {
    expect(getGuessedTypeFromValue(value)).toBe(type);
  });

  describe('when the transition is authorized', () => {
    it.each([
      {
        from: FieldTypes.LONG,
        to: FieldTypes.LONG,
        expectation: FieldTypes.LONG,
      },
      {
        from: FieldTypes.LONG,
        to: FieldTypes.LONG_64,
        expectation: FieldTypes.LONG_64,
      },
      {
        from: FieldTypes.LONG,
        to: FieldTypes.DOUBLE,
        expectation: FieldTypes.DOUBLE,
      },
      {
        from: FieldTypes.LONG_64,
        to: FieldTypes.DOUBLE,
        expectation: FieldTypes.DOUBLE,
      },
      {
        from: FieldTypes.DOUBLE,
        to: FieldTypes.DOUBLE,
        expectation: FieldTypes.DOUBLE,
      },
      {
        from: FieldTypes.LONG_64,
        to: FieldTypes.LONG,
        expectation: FieldTypes.LONG_64,
      },
      {
        from: FieldTypes.DOUBLE,
        to: FieldTypes.LONG_64,
        expectation: FieldTypes.DOUBLE,
      },
    ])(
      'From $from to $to should return $expectation',
      ({from, to, expectation}) => {
        expect(getMostEnglobingType(from, to)).toBe(expectation);
      }
    );
  });

  describe('when the transition is not authorized', () => {
    it.each([
      {
        from: FieldTypes.LONG_64,
        to: FieldTypes.STRING,
      },
      {
        from: FieldTypes.STRING,
        to: FieldTypes.LONG,
      },
    ])('From $from to $to should return $expectation', ({from, to}) => {
      expect(getMostEnglobingType(from, to)).toBe(null);
    });
  });
});
