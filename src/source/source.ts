import {PushSource} from '..';
import {PlatformUrlOptions} from '../environment';

/**
 * @deprecated This class has been replaced by {@link PushSource}
 */
export class Source {
  constructor(
    apikey: string,
    organizationid: string,
    options?: PlatformUrlOptions
  ) {
    console.log('This class has been deprecated');
    console.log('Use `new PushSource` instead');
    return new PushSource(apikey, organizationid, options);
  }
}
