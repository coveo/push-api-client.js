import {PrimitivesValues} from '@coveo/bueno';
import {PathLike} from 'fs';
import {PushApiClientBaseError} from './baseError';

export class NotAFileError extends PushApiClientBaseError {
  public name = 'Not A File Error';
  public constructor(p: PathLike) {
    super(`${p} is not a valid file, or does not exists.`);
  }
}
export class NotAJsonFileError extends PushApiClientBaseError {
  public name = 'Not A JSON File Error';
  public constructor(p: PathLike) {
    super(`${p} is not a valid JSON file.`);
  }
}

export class InvalidDocument extends PushApiClientBaseError {
  public name = 'Invalid JSON Document Error';
  private doc: Readonly<Record<string, PrimitivesValues>>;
  public constructor(
    p: PathLike,
    doc: Record<string, PrimitivesValues>,
    explanation: string
  ) {
    super(
      [
        `${p} is not a valid JSON: ${explanation}`,
        'Helpful links on the expected JSON format:',
        ' • JSON file example: https://github.com/coveo/push-api-client.js/tree/main/samples/json',
        ' • Document Body reference: https://docs.coveo.com/en/75#documentbody',
      ].join('\n')
    );
    this.doc = doc;
  }

  public get document() {
    return this.doc;
  }
}

export class UnsupportedAttribute extends PushApiClientBaseError {
  public name = 'Unsupported Attribute Error';
  public constructor(p: PathLike, unsupported: string) {
    super(
      `${p} contains a currently unsupported document attribute: ${unsupported}`
    );
  }
}
