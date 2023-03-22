import {PushApiClientBaseError} from './baseError';

export class ThrottleError extends PushApiClientBaseError {
  public name = 'Throttle Error';
  public constructor() {
    super();
  }
}
