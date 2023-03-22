import {PushApiClientBaseError} from './baseError';
import {ThrottleError} from './throttleError';

describe('ThrottleError', () => {
  it('has a proper name', () => {
    expect(new ThrottleError().name).toBe('Throttle Error');
  });

  it('inherit the PushApiClientBaseError', () => {
    expect(new ThrottleError()).toBeInstanceOf(PushApiClientBaseError);
  });
});
