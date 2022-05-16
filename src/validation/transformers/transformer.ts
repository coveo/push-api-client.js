export type Transformer = (str: string) => string;

const toLowerCase: Transformer = (field: string) =>
  field
    .toLowerCase()
    // Remove non-alpha numeric
    .replace(/[^a-z0-9]/gi, '')
    // Remove any leading number
    .replace(/^[0-9]+/g, '');

const toSnakeCase: Transformer = (field: string) =>
  field
    .toLowerCase()
    // Replace non-alpha numeric with underscores
    .replace(/[^a-z0-9]/gi, '_')
    // Remove any leading number or underscore
    .replace(/^[0-9_]+/g, '')
    // Remove consecutive underscores
    .replace(/_{2,}/g, '_')
    // Remove any trailing underscore
    .replace(/_$/g, '');

const identity: Transformer = (field: string) => field;

const ThawedBuiltInTransformers = {
  /**
   * A transformer that does nothing but return the string supplied to it.
   * Good as a default transformer function.
   *
   * _Transformation examples:_
   *
   * - `foo` => `foo`
   * - `bar` => `bar`
   */
  identity,
  /**
   * A transformer that removes leading numbers and replaces every non-alphanumeric characters with underscores
   *
   * _Transformation examples:_
   *
   * - `Field-With=Special+Characters` => `field_with_special_characters`
   * - `01-Numeric-Field-#01` => `numeric_field_01`
   */
  toLowerCase,
  /**
   * A transformer that removes leading numbers and non-alphanumeric characters.
   *
   * _Transformation examples:_
   *
   * - `Field-With=Special+Characters` => `fieldwithspecialcharacters`
   * - `01-Numeric-Field-#01` => `numericfield01`
   */
  toSnakeCase: toSnakeCase,
} as const;

export const BuiltInTransformers = Object.freeze(ThawedBuiltInTransformers);
