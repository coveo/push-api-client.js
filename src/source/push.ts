import 'fetch-undici-polyfill';

import {
  PlatformClient,
  SourceType,
  SourceVisibility,
} from '@coveo/platform-client';
export {SourceVisibility} from '@coveo/platform-client';
import {DocumentBuilder} from '../documentBuilder';
import dayjs = require('dayjs');
import {URL} from 'url';
import {
  castEnvironmentToPlatformClient,
  defaultOptions,
  Options,
} from '../environment';
import {FieldAnalyser} from '../fieldAnalyser/fieldAnalyser';
import {SecurityIdentity} from './securityIdenty';
import {
  BatchUpdateDocuments,
  BatchUpdateDocumentsFromFiles,
  BatchUpdateDocumentsOptions,
} from '../interfaces';
import {
  uploadBatch,
  uploadBatchFromFile,
  uploadDocument,
} from './documentUploader';
import {PushUrlBuilder} from '../help/urlUtils';
import {FileContainerStrategy, UploadStrategy} from '../uploadStrategy';
import {createFieldsFromReport} from '../fieldAnalyser/fieldUtils';
import {APICore} from '../APICore';

export type SourceStatus = 'REBUILD' | 'REFRESH' | 'INCREMENTAL' | 'IDLE';

/**
 * Manage a push source.
 *
 * Allows you to create a new push source, manage security identities and documents in a Coveo organization.
 */
export class PushSource {
  public platformClient: PlatformClient;
  private api: APICore;
  private options: Required<Options>;
  /**
   *
   * @param {string} apikey An apiKey capable of pushing documents and managing sources in a Coveo organization. See [Manage API Keys](https://docs.coveo.com/en/1718).
   * @param {string} organizationid The Coveo Organization identifier.
   * @param {Options} [opts=CatalogSource.defaultOptions] Platform request options.
   */
  constructor(
    private apikey: string,
    private organizationid: string,
    options?: Options
  ) {
    this.options = {...defaultOptions, ...options};
    this.api = new APICore(this.apikey, this.options);
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

  public get identity() {
    return new SecurityIdentity(this.platformClient);
  }

  /**
   * Adds or updates an individual item in a push source. See [Adding a Single Item in a Push Source](https://docs.coveo.com/en/133).
   * @param sourceID
   * @param docBuilder
   * @param {BatchUpdateDocumentsOptions}
   * @returns
   */
  public addOrUpdateDocument(
    sourceID: string,
    docBuilder: DocumentBuilder,
    options?: BatchUpdateDocumentsOptions
  ) {
    const addURL = new URL(`${this.urlBuilder(sourceID).baseURL}/documents`);
    return uploadDocument(
      this.platformClient,
      docBuilder,
      addURL,
      this.api,
      options
    );
  }

  /**
   * Manage batches of items in a push source. See [Manage Batches of Items in a Push Source](https://docs.coveo.com/en/90)
   * @param sourceID
   * @param batch
   * @returns
   */
  public batchUpdateDocuments(
    sourceID: string,
    batch: BatchUpdateDocuments,
    options?: BatchUpdateDocumentsOptions
  ) {
    return uploadBatch(
      this.platformClient,
      this.fileContainerStrategy(sourceID),
      batch,
      options
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
    return uploadBatchFromFile(
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
    return this.api.delete(deleteURL.toString(), false);
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
    return this.api.delete(deleteURL.toString(), false);
  }

  /**
   * Set the status of a push source. See [Updating the Status of a Push Source](https://docs.coveo.com/en/35/)
   * @param sourceID
   * @param status
   * @returns {Promise<void>}
   */
  public async setSourceStatus(
    sourceID: string,
    status: SourceStatus
  ): Promise<void> {
    const urlStatus = new URL(`${this.urlBuilder(sourceID).baseURL}/status`);
    urlStatus.searchParams.append('statusType', status);
    await this.api.post(urlStatus.toString());
  }

  public async createFields(analyser: FieldAnalyser) {
    const report = analyser.report();
    await createFieldsFromReport(this.platformClient, report);
  }

  private urlBuilder(sourceId: string) {
    return new PushUrlBuilder(sourceId, this.organizationid, this.options);
  }

  private fileContainerStrategy(sourceId: string): UploadStrategy {
    const urlBuilder = this.urlBuilder(sourceId);
    return new FileContainerStrategy(urlBuilder, this.api);
  }
}
