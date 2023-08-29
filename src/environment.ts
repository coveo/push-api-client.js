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
export const DEFAULT_EJECT_AFTER = 3600000;

export type PlatformUrlOptions = {
  environment?: PlatformEnvironment;
  region?: Region;
  retryAfter?: number;
  ejectAfter?: number;
};

const defaultOptions: PlatformUrlOptions = {
  environment: DEFAULT_ENVIRONMENT,
  region: DEFAULT_REGION,
  retryAfter: DEFAULT_RETRY_AFTER,
  ejectAfter: DEFAULT_EJECT_AFTER,
};

export function platformUrl(options?: PlatformUrlOptions) {
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
