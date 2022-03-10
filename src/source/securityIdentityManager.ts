require('isomorphic-fetch');
require('abortcontroller-polyfill');

import {
  PlatformClient,
  SecurityIdentityAliasModel,
  SecurityIdentityBatchConfig,
  SecurityIdentityDelete,
  SecurityIdentityDeleteOptions,
  SecurityIdentityModel,
  SourceType,
  SourceVisibility,
} from '@coveord/platform-client';
export {SourceVisibility} from '@coveord/platform-client';
import axios, {AxiosResponse} from 'axios';
import {DocumentBuilder} from '../documentBuilder';
import {URL} from 'url';
import {consumeGenerator} from '../help/generator';
import {parseAndGetDocumentBuilderFromJSONDocument} from '../validation/parseFile';
import {basename} from 'path';
import {getAllJsonFilesFromEntries} from '../help/file';
import {
  castEnvironmentToPlatformClient,
  DEFAULT_ENVIRONMENT,
  DEFAULT_REGION,
  platformUrl,
  PlatformUrlOptions,
} from '../environment';
import {FieldAnalyser} from '../fieldAnalyser/fieldAnalyser';
import {FieldTypeInconsistencyError} from '../errors/fieldErrors';
import {createFields} from '../fieldAnalyser/fieldUtils';
import {authorizeAxiosRequests} from './rest';

export type SourceStatus = 'REBUILD' | 'REFRESH' | 'INCREMENTAL' | 'IDLE';

/**
 * Manage a push source.
 *
 * Allows you to create a new push source, manage security identities and documents in a Coveo organization.
 */
export class SecurityIdentityManager {
  private options: Required<PlatformUrlOptions>;
  private static defaultOptions: Required<PlatformUrlOptions> = {
    region: DEFAULT_REGION,
    environment: DEFAULT_ENVIRONMENT,
  };
  private static maxContentLength = 5 * 1024 * 1024;
  /**
   *
   * @param apikey An apiKey capable of pushing documents and managing sources in a Coveo organization. See [Manage API Keys](https://docs.coveo.com/en/1718).
   * @param organizationid The Coveo Organization identifier.
   */
  constructor(
    private platformClient: PlatformClient,
    options: PlatformUrlOptions = SecurityIdentityManager.defaultOptions
  ) {
    this.options = {...SecurityIdentityManager.defaultOptions, ...options};
    // authorizeAxiosRequests(this.apikey); // TODO: not sure that is the best strategy to use. it can be hard to troubleshoot and test
  }

  /**
   * Create or update a security identity. See [Adding a Single Security Identity](https://docs.coveo.com/en/167) and [Security Identity Models](https://docs.coveo.com/en/139).
   * @param securityProviderId
   * @param securityIdentity
   * @returns
   */
  public createSecurityIdentity(
    securityProviderId: string,
    securityIdentity: SecurityIdentityModel
  ) {
    return this.platformClient.pushApi.createOrUpdateSecurityIdentity(
      securityProviderId,
      securityIdentity
    );
  }

  /**
   * Create or update a security identity alias. See [Adding a Single Alias](https://docs.coveo.com/en/142) and [User Alias Definition Examples](https://docs.coveo.com/en/46).
   * @param securityProviderId
   * @param securityIdentityAlias
   * @returns
   */
  public createOrUpdateSecurityIdentityAlias(
    securityProviderId: string,
    securityIdentityAlias: SecurityIdentityAliasModel
  ) {
    return this.platformClient.pushApi.createOrUpdateSecurityIdentityAlias(
      securityProviderId,
      securityIdentityAlias
    );
  }

  /**
   * Delete a security identity. See [Disabling a Single Security Identity](https://docs.coveo.com/en/84).
   * @param securityProviderId
   * @param securityIdentityToDelete
   * @returns
   */
  public deleteSecurityIdentity(
    securityProviderId: string,
    securityIdentityToDelete: SecurityIdentityDelete
  ) {
    return this.platformClient.pushApi.deleteSecurityIdentity(
      securityProviderId,
      securityIdentityToDelete
    );
  }

  /**
   * Delete old security identities. See [Disabling Old Security Identities](https://docs.coveo.com/en/33).
   * @param securityProviderId
   * @param batchDelete
   * @returns
   */
  public deleteOldSecurityIdentities(
    securityProviderId: string,
    batchDelete: SecurityIdentityDeleteOptions
  ) {
    return this.platformClient.pushApi.deleteOldSecurityIdentities(
      securityProviderId,
      batchDelete
    );
  }

  /**
   * Manage batches of security identities. See [Manage Batches of Security Identities](https://docs.coveo.com/en/55).
   */
  public manageSecurityIdentities(
    securityProviderId: string,
    batchConfig: SecurityIdentityBatchConfig
  ) {
    return this.platformClient.pushApi.manageSecurityIdentities(
      securityProviderId,
      batchConfig
    );
  }
}
