import {PathLike} from 'fs';

export abstract class PushApiClientBaseError extends Error {
  public name = 'Push API Client Error';
  public constructor(message?: string) {
    super(message);
  }
}

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
  public constructor(p: PathLike, explanation: string) {
    super(`${p} is not a valid JSON document: ${explanation}`);
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
