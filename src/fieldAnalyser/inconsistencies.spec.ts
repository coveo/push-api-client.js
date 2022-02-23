import {FieldTypes} from '@coveord/platform-client';
import {Inconsistencies} from './inconsistencies';

describe('Inconsistencies', () => {
  const insconsitencies = new Inconsistencies();

  beforeAll(() => {
    insconsitencies
      .add('foo', [FieldTypes.STRING, FieldTypes.VECTOR])
      .add('foo', [FieldTypes.STRING, FieldTypes.LONG_64])
      .add('bar', [FieldTypes.LONG, FieldTypes.STRING]);
  });

  it('should return the inconsistencies count', () => {
    expect(insconsitencies.count).toEqual(2);
  });

  it('should retrieve a specific inconsistency', () => {
    const set = new Set<FieldTypes>([
      FieldTypes.STRING,
      FieldTypes.VECTOR,
      FieldTypes.LONG_64,
    ]);
    expect(insconsitencies.get('foo')).toEqual(set);
  });

  it('should return undefined when retrieving invalid inconsistencies key', () => {
    expect(insconsitencies.get('invalid')).toBeUndefined();
  });

  it('should loop through inconsistencies', () => {
    const types: Set<FieldTypes>[] = [];
    const fields: string[] = [];
    insconsitencies.forEach((typeSet, field) => {
      types.push(typeSet);
      fields.push(field);
    });
    expect(types).toStrictEqual([
      new Set([FieldTypes.STRING, FieldTypes.VECTOR, FieldTypes.LONG_64]),
      new Set([FieldTypes.STRING, FieldTypes.LONG]),
    ]);
    expect(fields).toStrictEqual(['foo', 'bar']);
  });
});
