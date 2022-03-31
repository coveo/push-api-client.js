import {PushApiClientBaseError} from './baseError';

export class PrivilegeError extends PushApiClientBaseError {
  public name = 'Privilege Error';
  public constructor(public message: string) {
    super(message);
  }
}
