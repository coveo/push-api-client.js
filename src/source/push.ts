require('isomorphic-fetch');
require('abortcontroller-polyfill');

import {
  PlatformClient,
  SourceType,
  SourceVisibility,
} from '@coveord/platform-client';
import axios from 'axios';
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
import {createFields} from '../fieldAnalyser/fieldUtils';
import {SecurityIdentity} from './securityIdenty';
import {FileContainerStrategy} from '../uploadStrategy/fileContainerStrategy';
import {
  BatchUpdateDocuments,
  BatchUpdateDocumentsFromFiles,
  BatchUpdateDocumentsOptions,
} from '../interfaces';
import {FieldTypeInconsistencyError} from '../errors/fieldErrors';
import {axiosRequestHeaders} from '../help';
import {uploadBatch, uploadFiles} from './documentUploader';
import {PushUrlBuilder} from '../help/urlUtils';

export type SourceStatus = 'REBUILD' | 'REFRESH' | 'INCREMENTAL' | 'IDLE';

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
  private platformClient: PlatformClient;
  private options: Required<PlatformUrlOptions>;
  private securityIdentityManager: SecurityIdentity;
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
    opts: PlatformUrlOptions = PushSource.defaultOptions
  ) {
    this.options = {...PushSource.defaultOptions, ...opts};
    this.platformClient = new PlatformClient({
      accessToken: apikey,
      environment: castEnvironmentToPlatformClient(this.options.environment),
      organizationId: organizationid,
      region: opts.region,
    });
    this.securityIdentityManager = new SecurityIdentity(this.platformClient);
  }

  /**
   * Create a new push source
   * @param name The name of the source to create.
   * @param sourceVisibility The security option that should be applied to the content of the source. See [Content Security](https://docs.coveo.com/en/1779).
   * @returns
   */
  public create(name: string, sourceVisibility: SourceVisibility) {
    return this.platformClient.source.create({
      name,
      pushEnabled: true,
      sourceVisibility,
      sourceType: SourceType.PUSH,
    });
  }

  public get identity() {
    return this.securityIdentityManager;
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
    const addURL = new URL(`${this.urlBuilder(sourceId).baseURL}/documents`);
    addURL.searchParams.append('documentId', doc.uri);
    return axios.put(
      addURL.toString(),
      docBuilder.marshal(),
      this.documentsAxiosConfig
    );
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
    return uploadBatch(
      this.platformClient,
      this.fileContainerStrategy(sourceId),
      batch,
      createFields
    );
  }

  // TODO: document
  public async batchUpdateDocumentsFromFiles(
    sourceId: string,
    filesOrDirectories: string[],
    options?: BatchUpdateDocumentsFromFiles
  ) {
    return uploadFiles(
      this.platformClient,
      this.fileContainerStrategy(sourceId),
      filesOrDirectories,
      options
    );
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
    const deleteURL = new URL(`${this.urlBuilder(sourceId).baseURL}/documents`);
    deleteURL.searchParams.append('documentId', documentId);
    deleteURL.searchParams.append('deleteChildren', `${deleteChildren}`);
    return axios.delete(deleteURL.toString(), this.documentsAxiosConfig);
  }

  /**
   * Set the status of a push source. See [Updating the Status of a Push Source](https://docs.coveo.com/en/35/)
   * @param sourceId
   * @param status
   * @returns
   */
  public setSourceStatus(sourceId: string, status: SourceStatus) {
    const urlStatus = new URL(`${this.urlBuilder(sourceId).baseURL}/status`);
    urlStatus.searchParams.append('statusType', status);
    return axios.post(urlStatus.toString(), {}, this.documentsAxiosConfig);
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
      `${this.urlBuilder(sourceId).baseURL}/documents/olderthan`
    );
    deleteURL.searchParams.append('orderingId', `${date.valueOf()}`);
    return axios.delete(deleteURL.toString(), this.documentsAxiosConfig);
  }

  private get documentsAxiosConfig() {
    return axiosRequestHeaders(this.apikey);
  }

  private urlBuilder(sourceId: string) {
    return new PushUrlBuilder(sourceId, this.organizationid, this.options);
  }

  private async createFields(analyser: FieldAnalyser) {
    const {fields, inconsistencies} = analyser.report();

    if (inconsistencies.size > 0) {
      throw new FieldTypeInconsistencyError(inconsistencies);
    }
    await createFields(this.platformClient, fields);
  }

  private fileContainerStrategy(sourceId: string) {
    const urlBuilder = this.urlBuilder(sourceId);
    const documentsAxiosConfig = axiosRequestHeaders(this.apikey);
    return new FileContainerStrategy(urlBuilder, documentsAxiosConfig);
  }
}
