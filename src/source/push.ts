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
import axios, {AxiosRequestConfig} from 'axios';
import {DocumentBuilder} from '../documentBuilder';
import dayjs = require('dayjs');
import {URL} from 'url';
import {
  castEnvironmentToPlatformClient,
  DEFAULT_ENVIRONMENT,
  DEFAULT_REGION,
  PlatformUrlOptions,
} from '../environment';
import {FieldAnalyser} from '../fieldAnalyser/fieldAnalyser';
import {FieldTypeInconsistencyError} from '../errors/fieldErrors';
import {createFields} from '../fieldAnalyser/fieldUtils';
import {SecurityIdentity} from './securityIdenty';
import {
  BatchUpdateDocuments,
  BatchUpdateDocumentsFromFiles,
  BatchUpdateDocumentsOptions,
} from '../interfaces';
import {axiosRequestHeaders} from '../help/axiosUtils';
import {uploadBatch} from './documentUploader';
import {PushUrlBuilder} from '../help/urlUtils';
import {FileContainerStrategy, UploadStrategy} from '../uploadStrategy';
import {BatchUploadDocumentsFromFilesReturn} from './batchUploadDocumentsFromFile';

export type SourceStatus = 'REBUILD' | 'REFRESH' | 'INCREMENTAL' | 'IDLE';

/**
 * Manage a push source.
 *
 * Allows you to create a new push source, manage security identities and documents in a Coveo organization.
 */
export class PushSource {
  public platformClient: PlatformClient;
  private options: Required<PlatformUrlOptions>;
  private static defaultOptions: Required<PlatformUrlOptions> = {
    region: DEFAULT_REGION,
    environment: DEFAULT_ENVIRONMENT,
  };
  /**
   *
   * @param apikey An apiKey capable of pushing documents and managing sources in a Coveo organization. See [Manage API Keys](https://docs.coveo.com/en/1718).
   * @param organizationid The Coveo Organization identifier.
   */
  constructor(
    private apikey: string,
    private organizationid: string,
    options?: PlatformUrlOptions
  ) {
    this.options = {...PushSource.defaultOptions, ...options};
    this.platformClient = new PlatformClient({
      accessToken: this.apikey,
      environment: castEnvironmentToPlatformClient(this.options.environment),
      organizationId: this.organizationid,
      region: this.options.region,
    });
  }

  /**
   * Create a new push source
   * @param name The name of the source to create.
   * @param sourceVisibility The security option that should be applied to the content of the source. See [Content Security](https://docs.coveo.com/en/1779).
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
   * @deprecated use `identity.createSecurityIdentity`
   *
   * See {@link Source.identity}
   */
  public createSecurityIdentity(
    securityProviderId: string,
    securityIdentity: SecurityIdentityModel
  ) {
    return this.identity.createSecurityIdentity(
      securityProviderId,
      securityIdentity
    );
  }

  /**
   * @deprecated use `identity.createOrUpdateSecurityIdentityAlias`
   *
   * See {@link Source.identity}
   */
  public createOrUpdateSecurityIdentityAlias(
    securityProviderId: string,
    securityIdentityAlias: SecurityIdentityAliasModel
  ) {
    return this.identity.createOrUpdateSecurityIdentityAlias(
      securityProviderId,
      securityIdentityAlias
    );
  }

  /**
   * @deprecated use `identity.deleteSecurityIdentity`
   *
   * See {@link Source.identity}
   */
  public deleteSecurityIdentity(
    securityProviderId: string,
    securityIdentityToDelete: SecurityIdentityDelete
  ) {
    return this.identity.deleteSecurityIdentity(
      securityProviderId,
      securityIdentityToDelete
    );
  }

  /**
   * @deprecated use `identity.deleteOldSecurityIdentities`
   *
   * See {@link Source.identity}
   */
  public deleteOldSecurityIdentities(
    securityProviderId: string,
    batchDelete: SecurityIdentityDeleteOptions
  ) {
    return this.identity.deleteOldSecurityIdentities(
      securityProviderId,
      batchDelete
    );
  }

  /**
   * @deprecated use `identity.manageSecurityIdentities`
   *
   * See {@link Source.identity}
   */
  public manageSecurityIdentities(
    securityProviderId: string,
    batchConfig: SecurityIdentityBatchConfig
  ) {
    return this.identity.manageSecurityIdentities(
      securityProviderId,
      batchConfig
    );
  }

  public get identity() {
    return new SecurityIdentity(this.platformClient);
  }

  /**
   * Adds or updates an individual item in a push source. See [Adding a Single Item in a Push Source](https://docs.coveo.com/en/133).
   * @param sourceID
   * @param docBuilder
   * @param {BatchUpdateDocumentsOptions} [{createFields = true}={}]
   * @returns
   */
  public async addOrUpdateDocument(
    sourceID: string,
    docBuilder: DocumentBuilder,
    {createFields: createFields = true}: BatchUpdateDocumentsOptions = {}
  ) {
    if (createFields) {
      const analyser = new FieldAnalyser(this.platformClient);
      await analyser.add([docBuilder]);
      await this.createFields(analyser);
    }

    const doc = docBuilder.build();
    const addURL = new URL(`${this.urlBuilder(sourceID).baseURL}/documents`);
    addURL.searchParams.append('documentId', doc.uri);
    return axios.put(
      addURL.toString(),
      docBuilder.marshal(),
      this.documentsAxiosConfig
    );
  }

  /**
   * Manage batches of items in a push source. See [Manage Batches of Items in a Push Source](https://docs.coveo.com/en/90)
   * @param sourceID
   * @param batch
   * @returns
   */
  public async batchUpdateDocuments(
    sourceID: string,
    batch: BatchUpdateDocuments,
    {createFields: createFields = true}: BatchUpdateDocumentsOptions = {}
  ) {
    return uploadBatch(
      this.platformClient,
      this.fileContainerStrategy(sourceID),
      batch,
      createFields
    );
  }

  /**
   *
   * Manage batches of items in a push source from a list of JSON files. See [Manage Batches of Items in a Push Source](https://docs.coveo.com/en/90)
   * @param {string} sourceID The unique identifier of the target Push source
   * @param {string[]} filesOrDirectories A list of JSON files or directories (containing JSON files) from which to extract documents.
   * @param {UploadBatchCallback} callback Callback executed when a batch of documents is either successfully uploaded or when an error occurs during the upload
   * @param {BatchUpdateDocumentsFromFiles} options
   */
  public batchUpdateDocumentsFromFiles(
    sourceID: string,
    filesOrDirectories: string[],
    options?: BatchUpdateDocumentsFromFiles
  ) {
    return new BatchUploadDocumentsFromFilesReturn(
      this.platformClient,
      this.fileContainerStrategy(sourceID),
      filesOrDirectories,
      options
    );
  }

  /**
   * Deletes a specific item from a Push source. Optionally, the child items of that item can also be deleted. See [Deleting an Item in a Push Source](https://docs.coveo.com/en/171).
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
    const deleteURL = new URL(`${this.urlBuilder(sourceID).baseURL}/documents`);
    deleteURL.searchParams.append('documentId', documentId);
    deleteURL.searchParams.append('deleteChildren', `${deleteChildren}`);
    return axios.delete(deleteURL.toString(), this.documentsAxiosConfig);
  }

  /**
   * Deletes all items whose last update was made by a Push API operation whose orderingId is strictly lower than a specified value. See [Deleting Old Items in a Push Source](https://docs.coveo.com/en/131).
   * @param sourceID
   * @param olderThan
   * @returns
   */
  public deleteDocumentsOlderThan(
    sourceID: string,
    olderThan: Date | string | number
  ) {
    const date = dayjs(olderThan);
    const deleteURL = new URL(
      `${this.urlBuilder(sourceID).baseURL}/documents/olderthan`
    );
    deleteURL.searchParams.append('orderingId', `${date.valueOf()}`);
    return axios.delete(deleteURL.toString(), this.documentsAxiosConfig);
  }

  /**
   * Set the status of a push source. See [Updating the Status of a Push Source](https://docs.coveo.com/en/35/)
   * @param sourceID
   * @param status
   * @returns
   */
  public setSourceStatus(sourceID: string, status: SourceStatus) {
    const urlStatus = new URL(`${this.urlBuilder(sourceID).baseURL}/status`);
    urlStatus.searchParams.append('statusType', status);
    return axios.post(urlStatus.toString(), {}, this.documentsAxiosConfig);
  }

  private get documentsAxiosConfig(): AxiosRequestConfig {
    return axiosRequestHeaders(this.apikey);
  }

  public async createFields(analyser: FieldAnalyser) {
    const {fields, inconsistencies} = analyser.report();

    if (inconsistencies.size > 0) {
      throw new FieldTypeInconsistencyError(inconsistencies);
    }
    await createFields(this.platformClient, fields);
  }

  private urlBuilder(sourceId: string) {
    return new PushUrlBuilder(sourceId, this.organizationid, this.options);
  }

  private fileContainerStrategy(sourceId: string): UploadStrategy {
    const urlBuilder = this.urlBuilder(sourceId);
    const documentsAxiosConfig = axiosRequestHeaders(this.apikey);
    return new FileContainerStrategy(urlBuilder, documentsAxiosConfig);
  }
}
