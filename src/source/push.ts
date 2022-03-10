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
import axios, {AxiosRequestConfig, AxiosResponse} from 'axios';
import {DocumentBuilder} from '../documentBuilder';
import dayjs = require('dayjs');
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
import {SecurityIdentityManager} from './securityIdentityManager';
import {FileContainerStrategy} from '../uploadStrategy/fileContainerStrategy';

export type SourceStatus = 'REBUILD' | 'REFRESH' | 'INCREMENTAL' | 'IDLE';
// export enum SupportedSourceType {
//   PUSH = SourceType.PUSH,
//   CATALOG = SourceType.CATALOG,
// }

export interface BatchUpdateDocuments {
  addOrUpdate: DocumentBuilder[];
  delete: {documentId: string; deleteChildren: boolean}[];
}

/**
 *
 * @param {string[]} files Files from which the documentBuilders were generated
 * @param {DocumentBuilder[]} batch List of the uploaded DocumentBuilders
 * @param {AxiosResponse} res Axios response
 */

/**
 * Manage a push source.
 *
 * Allows you to create a new push source, manage security identities and documents in a Coveo organization.
 */
export class PushSource {
  private source: SecurityIdentityManager;
  // TODO: maybe will no longer need to use this.platformclient
  private platformClient: PlatformClient;
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
    private apikey: string,
    private organizationid: string,
    options: PlatformUrlOptions = PushSource.defaultOptions
  ) {
    this.options = {...PushSource.defaultOptions, ...options};
    this.platformClient = new PlatformClient({
      accessToken: this.apikey,
      environment: castEnvironmentToPlatformClient(this.options.environment),
      organizationId: this.organizationid,
      region: this.options.region,
    });
    this.source = new SecurityIdentityManager(apikey, organizationid, options);
  }

  /**
   * Create a new push source
   * @param name The name of the source to create.
   * @param sourceVisibility The security option that should be applied to the content of the source. See [Content Security](https://docs.coveo.com/en/1779).
   * @returns
   */
  public create(name: string, sourceVisibility: SourceVisibility) {
    return this.source.create(name, sourceVisibility, SourceType.PUSH);
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
    // TODO: base source
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
    // TODO: base source
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
    // TODO: base source
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
    // TODO: base source
  }

  /**
   * Manage batches of security identities. See [Manage Batches of Security Identities](https://docs.coveo.com/en/55).
   */
  public manageSecurityIdentities(
    securityProviderId: string,
    batchConfig: SecurityIdentityBatchConfig
  ) {
    // TODO: base source
  }

  /**
   * Adds or updates an individual item in a push source. See [Adding a Single Item in a Push Source](https://docs.coveo.com/en/133).
   * @param sourceId
   * @param docBuilder
   * @param {BatchUpdateDocumentsOptions} [{createFields = true}={}]
   * @returns
   */
  public async addOrUpdateDocument(
    sourceId: string,
    docBuilder: DocumentBuilder,
    {createFields: createFields = true}: BatchUpdateDocumentsOptions = {}
  ) {
    if (createFields) {
      const analyser = new FieldAnalyser(this.platformClient);
      await analyser.add([docBuilder]);
      await this.createFields(analyser);
    }

    const doc = docBuilder.build();
    const addURL = new URL(this.getBaseAPIURLForDocuments(sourceId));
    addURL.searchParams.append('documentId', doc.uri);
    return axios.put(addURL.toString(), docBuilder.marshal());
  }

  /**
   * Manage batches of items in a push source. See [Manage Batches of Items in a Push Source](https://docs.coveo.com/en/90)
   * @param sourceId
   * @param batch
   * @returns
   */
  public async batchUpdateDocuments(
    sourceId: string,
    batch: BatchUpdateDocuments,
    {createFields: createFields = true}: BatchUpdateDocumentsOptions = {}
  ) {
    if (createFields) {
      const analyser = new FieldAnalyser(this.platformClient);
      await analyser.add(batch.addOrUpdate);
      await this.createFields(analyser);
    }

    const strategy = new FileContainerStrategy();
    await strategy.upload(sourceId, batch);
  }

  /**
   *
   * Manage batches of items in a push source from a list of JSON files. See [Manage Batches of Items in a Push Source](https://docs.coveo.com/en/90)
   * @param {string} sourceId The unique identifier of the target Push source
   * @param {string[]} filesOrDirectories A list of JSON files or directories (containing JSON files) from which to extract documents.
   * @param {UploadBatchCallback} callback Callback executed when a batch of documents is either successfully uploaded or when an error occurs during the upload
   * @param {BatchUpdateDocumentsFromFiles} options
   */
  public async batchUpdateDocumentsFromFiles(
    sourceId: string,
    filesOrDirectories: string[],
    callback: UploadBatchCallback,
    options?: BatchUpdateDocumentsFromFiles
  ) {
    const strategy = new FileContainerStrategy();
    const files = getAllJsonFilesFromEntries(filesOrDirectories);
    if (createFields) {
      // ... TODO:
    }

    await strategy.doTheMagic(sourceId, files, callback);
  }

  /**
   * Deletes a specific item from a Push source. Optionally, the child items of that item can also be deleted. See [Deleting an Item in a Push Source](https://docs.coveo.com/en/171).
   * @param sourceId
   * @param documentId
   * @param deleteChildren
   * @returns
   */
  public deleteDocument(
    sourceId: string,
    documentId: string,
    deleteChildren = false
  ) {
    const deleteURL = new URL(this.getBaseAPIURLForDocuments(sourceId));
    deleteURL.searchParams.append('documentId', documentId);
    deleteURL.searchParams.append('deleteChildren', `${deleteChildren}`);
    return axios.delete(deleteURL.toString());
  }

  /**
   * Deletes all items whose last update was made by a Push API operation whose orderingId is strictly lower than a specified value. See [Deleting Old Items in a Push Source](https://docs.coveo.com/en/131).
   * @param sourceId
   * @param olderThan
   * @returns
   */
  public deleteDocumentsOlderThan(
    sourceId: string,
    olderThan: Date | string | number
  ) {
    const date = dayjs(olderThan);
    const deleteURL = new URL(
      `${this.getBaseAPIURLForDocuments(sourceId)}/olderthan`
    );
    deleteURL.searchParams.append('orderingId', `${date.valueOf()}`);
    return axios.delete(deleteURL.toString());
  }

  private get baseAPIURL() {
    return `${platformUrl(this.options)}/${this.organizationid}`;
  }

  private getBaseAPIURLForDocuments(sourceId: string) {
    return `${this.baseAPIURL}/sources/${sourceId}/documents`;
  }
}
