require('isomorphic-fetch');
require('abortcontroller-polyfill');

import {
  PlatformClient,
  SourceType,
  SourceVisibility,
} from '@coveord/platform-client';
import {
  castEnvironmentToPlatformClient,
  DEFAULT_ENVIRONMENT,
  DEFAULT_REGION,
  PlatformUrlOptions,
} from '../environment';
import {SecurityIdentity} from './securityIdenty';
import {StreamChunkStrategy, FileContainerStrategy} from '../uploadStrategy';
import {
  BatchUpdateDocuments,
  BatchUpdateDocumentsFromFiles,
  BatchUpdateDocumentsOptions,
} from '../interfaces';
import {axiosRequestHeaders} from '../help/axiosUtils';
import {uploadBatch} from './documentUploader';
import {StreamUrlBuilder} from '../help/urlUtils';
import {BatchUploadDocumentsFromFilesReturn} from './batchUploadDocumentsFromFile';

/**
 * Manage a catalog source.
 *
 * Allows you to create a new catalog source, manage security identities and documents in a Coveo organization.
 */
export class CatalogSource {
  private platformClient: PlatformClient;
  private options: Required<PlatformUrlOptions>;
  private static defaultOptions: Required<PlatformUrlOptions> = {
    region: DEFAULT_REGION,
    environment: DEFAULT_ENVIRONMENT,
  };

  /**
   * Creates an instance of CatalogSource.
   * @param {string} apikey An apiKey capable of pushing documents and managing sources in a Coveo organization. See [Manage API Keys](https://docs.coveo.com/en/1718).
   * @param {string} organizationid The Coveo Organization identifier.
   * @param {PlatformUrlOptions} [opts=CatalogSource.defaultOptions]
   */
  constructor(
    private apikey: string,
    private organizationid: string,
    opts: PlatformUrlOptions = CatalogSource.defaultOptions
  ) {
    this.options = {...CatalogSource.defaultOptions, ...opts};
    this.platformClient = new PlatformClient({
      accessToken: apikey,
      environment: castEnvironmentToPlatformClient(this.options.environment),
      organizationId: organizationid,
      region: this.options.region,
    });
  }

  /**
   * Create a new catalog source
   * @param name The name of the source to create.
   * @param sourceVisibility The security option that should be applied to the content of the source. See [Content Security](https://docs.coveo.com/en/1779).
   * @returns
   */
  public create(name: string, sourceVisibility: SourceVisibility) {
    return this.platformClient.source.create({
      name,
      streamEnabled: true,
      sourceVisibility,
      sourceType: SourceType.CATALOG,
    });
  }

  public get identity() {
    return new SecurityIdentity(this.platformClient);
  }

  /**
   * Manage batches of items in a catalog source.
   * See [Full Document Update](https://docs.coveo.com/en/l62e0540)
   * @param sourceId
   * @param batch
   * @param {BatchUpdateDocumentsOptions} [{createFields: createFields = true}={}]
   * @returns
   */
  public batchUpdateDocuments(
    sourceId: string,
    batch: BatchUpdateDocuments,
    {createFields: createFields = true}: BatchUpdateDocumentsOptions = {}
  ) {
    const strategy = this.fileContainerStrategy(sourceId);
    return uploadBatch(this.platformClient, strategy, batch, createFields);
  }

  /**
   * Send your catalog data to your catalog source.
   * See [How to Stream Your Catalog Data to Your Source](https://docs.coveo.com/en/lb4a0344)
   * @param {string} sourceId
   * @param {BatchUpdateDocuments} batch
   * @param {BatchUpdateDocumentsOptions} [{createFields: createFields = true}={}]
   */
  public async batchStreamDocuments(
    sourceId: string,
    batch: BatchUpdateDocuments,
    {createFields: createFields = true}: BatchUpdateDocumentsOptions = {}
  ) {
    const strategy = this.streamChunkStrategy(sourceId);
    await uploadBatch(this.platformClient, strategy, batch, createFields);
  }

  /**
   * Manage batches of items in a catalog source from a list of JSON files. See [Full Document Update Source](https://docs.coveo.com/en/l62e0540)
   * @param {string} sourceId The unique identifier of the target Push source
   * @param {string[]} filesOrDirectories A list of JSON files or directories (containing JSON files) from which to extract documents.
   * @param {BatchUpdateDocumentsFromFiles} options
   */
  public batchUpdateDocumentsFromFiles(
    sourceId: string,
    filesOrDirectories: string[],
    options?: BatchUpdateDocumentsFromFiles
  ) {
    return new BatchUploadDocumentsFromFilesReturn(
      this.platformClient,
      this.fileContainerStrategy(sourceId),
      filesOrDirectories,
      options
    );
  }

  /**
   * Send your catalog data to your catalog source from a list of JSON files.
   * See [How to Stream Your Catalog Data to Your Source](https://docs.coveo.com/en/lb4a0344)
   * @param {string} sourceId The unique identifier of the target Push source
   * @param {string[]} filesOrDirectories A list of JSON files or directories (containing JSON files) from which to extract documents.
   * @param {BatchUpdateDocumentsFromFiles} [options]
   */
  public batchStreamDocumentsFromFiles(
    sourceId: string,
    filesOrDirectories: string[],
    options?: BatchUpdateDocumentsFromFiles
  ) {
    return new BatchUploadDocumentsFromFilesReturn(
      this.platformClient,
      this.streamChunkStrategy(sourceId),
      filesOrDirectories,
      options
    );
  }

  private urlBuilder(sourceId: string) {
    return new StreamUrlBuilder(sourceId, this.organizationid, this.options);
  }

  private fileContainerStrategy(sourceId: string): FileContainerStrategy {
    const urlBuilder = this.urlBuilder(sourceId);
    const documentsAxiosConfig = axiosRequestHeaders(this.apikey);
    return new FileContainerStrategy(urlBuilder, documentsAxiosConfig);
  }

  private streamChunkStrategy(sourceId: string): StreamChunkStrategy {
    const urlBuilder = this.urlBuilder(sourceId);
    const documentsAxiosConfig = axiosRequestHeaders(this.apikey);
    return new StreamChunkStrategy(urlBuilder, documentsAxiosConfig);
  }
}