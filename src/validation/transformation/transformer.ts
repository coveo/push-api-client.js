// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {BuiltInTransformers} from './builtInTransformers';

/**
 * Utility class to transform a string using a transformation function.
 *
 * For a list of built-in transformers, use {@link BuiltInTransformers}.
 */
export class Transformer {
  /**
   * @param {(str: string) => string} func The transformation function
   */
  public constructor(private func: (str: string) => string) {}

  /**
   * Executes the transformation function to the input string
   *
   * @param {string} str The string to transform
   * @return {*} The transformed string
   */
  public transform(str: string) {
    return this.func(str);
  }
}
