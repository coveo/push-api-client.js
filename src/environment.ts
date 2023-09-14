import {Region, Environment} from '@coveo/platform-client';
export {Region} from '@coveo/platform-client';

export enum PlatformEnvironment {
  Dev = 'dev',
  Stg = 'stg',
  Hipaa = 'hipaa',
  Prod = 'prod',
}

export const DEFAULT_ENVIRONMENT = PlatformEnvironment.Prod as const;
export const DEFAULT_REGION = Region.US as const;
export const DEFAULT_RETRY_AFTER = 5000;
export const DEFAULT_MAX_RETRIES = 10;
export const DEFAULT_TIME_MULTIPLE = 2;

export type PlatformOptions = {
  /**
   * The platform environment in which to execute all outgoing requests.
   *
   *  Optional, will default to production.
   */
  environment?: PlatformEnvironment;
  /**
   * The platform region in which to execute all outgoing requests.
   *
   * Optional, will default to US.
   */
  region?: Region;
  /**
   * The amount of time, in milliseconds, to wait between throttled request attempts.
   *
   * Optional, will default to 5000.
   */
  retryAfter?: number;
  /**
   * The maximum number of times to retry throttled requests.
   *
   * Optional, will default to 10.
   */
  maxRetries?: number;
  /**
   * The multiple by which to increase the wait time between each throttled request attempt
   *
   * Optional, will default to 2.
   */
  timeMultiple?: number;
};

export const defaultOptions: Required<PlatformOptions> = {
  environment: DEFAULT_ENVIRONMENT,
  region: DEFAULT_REGION,
  retryAfter: DEFAULT_RETRY_AFTER,
  maxRetries: DEFAULT_MAX_RETRIES,
  timeMultiple: DEFAULT_TIME_MULTIPLE,
};

export function platformUrl(options?: PlatformOptions) {
  options = {...defaultOptions, ...options};
  const urlEnv =
    options.environment === DEFAULT_ENVIRONMENT ? '' : options.environment;
  const urlRegion =
    options.region === DEFAULT_REGION ? '' : `-${options.region}`;

  return `https://api${urlEnv}${urlRegion}.cloud.coveo.com/push/v1/organizations`;
}

export function castEnvironmentToPlatformClient(
  e: PlatformEnvironment
): Environment {
  switch (e) {
    case 'dev':
      return Environment.dev;
    case 'stg':
      return Environment.stg;
    case 'prod':
      return Environment.prod;
    case 'hipaa':
      return Environment.hipaa;
    default:
      return Environment.prod;
  }
}
