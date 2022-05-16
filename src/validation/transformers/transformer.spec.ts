import {BuiltInTransformers} from './transformer';

describe('FieldNametransformer', () => {
  it.each([
    {
      transformer: BuiltInTransformers.toLowerCase,
      expectedKey: 'foo',
    },
    {
      transformer: BuiltInTransformers.toSnakeCase,
      expectedKey: 'f_o_o',
    },
  ])('should format to $expectedKey', ({expectedKey, transformer}) => {
    expect(transformer('f-o=o')).toEqual(expectedKey);
  });

  it('should transform with custom transformer', () => {
    const transformer = (s: string) => `${s}${s}`;
    expect(transformer('foo')).toEqual('foofoo');
  });
});
