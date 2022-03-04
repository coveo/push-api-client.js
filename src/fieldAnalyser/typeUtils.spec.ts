import {FieldTypes} from '@coveord/platform-client';
import {getGuessedTypeFromValue, isValidTypeTransition} from './typeUtils';

describe('typeUtils', () => {
  const signedIntegerLimit = 2147483647;

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
  ])('value $value should be of type $type', ({value, type}) => {
    expect(getGuessedTypeFromValue(value)).toBe(type);
  });

  describe('when the transition is authorized', () => {
    it.each([
      {from: FieldTypes.LONG, to: FieldTypes.LONG},
      {from: FieldTypes.LONG, to: FieldTypes.LONG_64},
      {from: FieldTypes.LONG, to: FieldTypes.DOUBLE},
      {from: FieldTypes.LONG_64, to: FieldTypes.DOUBLE},
      {from: FieldTypes.DOUBLE, to: FieldTypes.DOUBLE},
    ])('should return true', ({from, to}) => {
      expect(isValidTypeTransition(from, to)).toBe(true);
    });
  });

  describe('when the transition is not authorized', () => {
    it.each([
      {from: FieldTypes.LONG_64, to: FieldTypes.LONG},
      {from: FieldTypes.DOUBLE, to: FieldTypes.LONG_64},
      {from: FieldTypes.LONG_64, to: FieldTypes.STRING},
      {from: FieldTypes.STRING, to: FieldTypes.LONG},
    ])('should return true', ({from, to}) => {
      expect(isValidTypeTransition(from, to)).toBe(false);
    });
  });
});
