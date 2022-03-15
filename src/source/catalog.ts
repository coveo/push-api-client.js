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
import {
  StreamChunkStrategy,
  FileContainerStrategy,
  StreamUrlBuilder,
} from '../uploadStrategy';
import {
  BatchUpdateDocuments,
  BatchUpdateDocumentsFromFiles,
  BatchUpdateDocumentsOptions,
} from '../interfaces';
import {DocumentPusher} from './documentPusher';
import {axiosRequestHeaders} from '../help';

/**
 * Manage a catalog source.
 *
 * Allows you to create a new push source, manage security identities and documents in a Coveo organization.
 */
export class CatalogSource {
  private urlBuilderFactory: (sourceId: string) => StreamUrlBuilder;
  private documentPusher: DocumentPusher;
  private securityIdentityManager: SecurityIdentity;
  private platformClient: PlatformClient;

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
    organizationid: string,
    options: PlatformUrlOptions = CatalogSource.defaultOptions
  ) {
    const opts = {...CatalogSource.defaultOptions, ...options};
    this.platformClient = new PlatformClient({
      accessToken: apikey,
      environment: castEnvironmentToPlatformClient(opts.environment),
      organizationId: organizationid,
      region: options.region,
    });
    this.securityIdentityManager = new SecurityIdentity(this.platformClient);
    this.documentPusher = new DocumentPusher(this.platformClient);
    this.urlBuilderFactory = (sourceId: string) =>
      new StreamUrlBuilder(sourceId, organizationid, apikey, opts);
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
    return this.securityIdentityManager;
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
    return this.documentPusher.singleBatch(
      this.fileContainerStrategy(sourceId),
      batch,
      createFields
    );
  }

  public async initialLoad(
    sourceId: string,
    batch: BatchUpdateDocuments,
    {createFields: createFields = true}: BatchUpdateDocumentsOptions = {}
  ) {
    return this.documentPusher.singleBatch(
      this.streamChunkStrategy(sourceId),
      batch,
      createFields
    );
  }

  /**
   *
   * Manage batches of items in a push source from a list of JSON files. See [Manage Batches of Items in a Push Source](https://docs.coveo.com/en/90)
   * @param {string} sourceId The unique identifier of the target Push source
   * @param {string[]} filesOrDirectories A list of JSON files or directories (containing JSON files) from which to extract documents.
   * @param {BatchUpdateDocumentsFromFiles} options
   */
  public async batchUpdateDocumentsFromFiles(
    sourceId: string,
    filesOrDirectories: string[],
    options?: BatchUpdateDocumentsFromFiles
  ) {
    return this.documentPusher.multipleBatches(
      this.fileContainerStrategy(sourceId),
      filesOrDirectories,
      options
    );
  }

  public fullLoadFromFiles(
    sourceId: string,
    filesOrDirectories: string[],
    options?: BatchUpdateDocumentsFromFiles
  ) {
    return this.documentPusher.multipleBatches(
      this.streamChunkStrategy(sourceId),
      filesOrDirectories,
      options
    );
  }

  private fileContainerStrategy(sourceId: string) {
    const urlBuilder = this.urlBuilderFactory(sourceId);
    const documentsAxiosConfig = axiosRequestHeaders(this.apikey);
    return new FileContainerStrategy(urlBuilder, documentsAxiosConfig);
  }

  private streamChunkStrategy(sourceId: string) {
    const urlBuilder = this.urlBuilderFactory(sourceId);
    const documentsAxiosConfig = axiosRequestHeaders(this.apikey);
    return new StreamChunkStrategy(urlBuilder, documentsAxiosConfig);
  }
}
