require('isomorphic-fetch');
require('abortcontroller-polyfill');

import {
  Environment,
  PlatformClient,
  SecurityIdentityAliasModel,
  SecurityIdentityBatchConfig,
  SecurityIdentityDelete,
  SecurityIdentityDeleteOptions,
  SecurityIdentityModel,
  SourceType,
  SourceVisibility,
} from '@coveord/platform-client';
export {Environment, SourceVisibility} from '@coveord/platform-client';
import axios, {AxiosRequestConfig} from 'axios';
import {DocumentBuilder} from './documentBuilder';
import dayjs = require('dayjs');
import {URL} from 'url';

/**
 * Manage a push source.
 *
 * Allows you to create a new push source, manage security identities and documents in a Coveo organization.
 */
export class Source {
  private platformClient: PlatformClient;
  /**
   *
   * @param apikey An apiKey capable of pushing documents and managing sources in a Coveo organization. See https://docs.coveo.com/en/1718
   * @param organizationid The Coveo Organization identifier.
   */
  constructor(private apikey: string, private organizationid: string) {
    this.platformClient = new PlatformClient({
      accessToken: this.apikey,
      environment: Environment.prod,
      organizationId: this.organizationid,
    });
  }

  /**
   * Create a new push source
   * @param name The name of the source to create.
   * @param sourceVisibility The security option that should be applied to the content of the source. See https://docs.coveo.com/en/1779
   * @returns
   */
  public create(name: string, sourceVisibility: SourceVisibility) {
    return this.platformClient.source.create({
      sourceType: SourceType.PUSH,
      pushEnabled: true,
      name,
      sourceVisibility,
    });
  }

  /**
   * Create or update a security identity. See https://docs.coveo.com/en/167 and https://docs.coveo.com/en/139
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
   * Create or update a security identity alias. See https://docs.coveo.com/en/142 and https://docs.coveo.com/en/46
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
   * Delete a security identity. See https://docs.coveo.com/en/84
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
   * Delete old security identities. See https://docs.coveo.com/en/33/
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
   * Manage batches of security identities. See https://docs.coveo.com/en/55
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

  /**
   * Adds or updates an individual item in a push source. See https://docs.coveo.com/en/133
   * @param sourceID
   * @param docBuilder
   * @returns
   */
  public addOrUpdateDocument(sourceID: string, docBuilder: DocumentBuilder) {
    const doc = docBuilder.build();
    const addURL = new URL(this.getBaseAPIURL(sourceID));
    addURL.searchParams.append('documentId', doc.uri);
    return axios.put(addURL.toString(), docBuilder.marshal(), this.axiosConfig);
  }

  /**
   * Deletes a specific item from a Push source. Optionally, the child items of that item can also be deleted. See https://docs.coveo.com/en/171
   * @param sourceID
   * @param documentId
   * @param deleteChildren
   * @returns
   */
  public deleteDocument(
    sourceID: string,
    documentId: string,
    deleteChildren = false
  ) {
    const deleteURL = new URL(this.getBaseAPIURL(sourceID));
    deleteURL.searchParams.append('documentId', documentId);
    deleteURL.searchParams.append('deleteChildren', `${deleteChildren}`);
    return axios.delete(deleteURL.toString(), this.axiosConfig);
  }

  /**
   * Deletes all items whose last update was made by a Push API operation whose orderingId is strictly lower than a specified value. See https://docs.coveo.com/en/131
   * @param sourceID
   * @param olderThan
   * @returns
   */
  public deleteDocumentsOlderThan(
    sourceID: string,
    olderThan: Date | string | number
  ) {
    const date = dayjs(olderThan);
    const deleteURL = new URL(`${this.getBaseAPIURL(sourceID)}/olderthan`);
    deleteURL.searchParams.append('orderingId', `${date.valueOf()}`);
    return axios.delete(deleteURL.toString(), this.axiosConfig);
  }

  private getBaseAPIURL(sourceID: string) {
    return `https://api.cloud.coveo.com/push/v1/organizations/${this.organizationid}/sources/${sourceID}/documents`;
  }

  private get axiosConfig(): AxiosRequestConfig {
    return {
      headers: this.requestHeaders,
    };
  }

  private get requestHeaders() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${this.apikey}`,
    };
  }
}
