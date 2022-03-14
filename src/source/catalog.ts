require('isomorphic-fetch');
require('abortcontroller-polyfill');

import {
  PlatformClient,
  SourceType,
  SourceVisibility,
} from '@coveord/platform-client';
import {getAllJsonFilesFromEntries} from '../help';
import {
  castEnvironmentToPlatformClient,
  DEFAULT_ENVIRONMENT,
  DEFAULT_REGION,
  PlatformUrlOptions,
} from '../environment';
import {FieldAnalyser} from '../fieldAnalyser/fieldAnalyser';
import {FieldTypeInconsistencyError} from '../errors/fieldErrors';
import {createFields} from '../fieldAnalyser/fieldUtils';
import {SecurityIdentity} from './securityIdentityManager';
import {
  Strategy,
  StreamChunkStrategy,
  FileContainerStrategy,
} from '../uploadStrategy';
import {
  BatchUpdateDocuments,
  BatchUpdateDocumentsFromFiles,
  BatchUpdateDocumentsOptions,
} from '../interfaces';
import {parseAndGetDocumentBuilderFromJSONDocument} from '../validation/parseFile';

/**
 * Manage a push source.
 *
 * Allows you to create a new push source, manage security identities and documents in a Coveo organization.
 */
export class CatalogSource {
  private securityIdentityManager: SecurityIdentity;
  private platformClient: PlatformClient;
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
    options: PlatformUrlOptions = CatalogSource.defaultOptions
  ) {
    this.options = {...CatalogSource.defaultOptions, ...options};
    this.platformClient = new PlatformClient({
      accessToken: this.apikey,
      environment: castEnvironmentToPlatformClient(this.options.environment),
      organizationId: this.organizationid,
      region: this.options.region,
    });
    this.securityIdentityManager = new SecurityIdentity(this.platformClient);
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
    return this.singleBatch(
      this.fileContainerStrategy,
      sourceId,
      batch,
      createFields
    );
  }

  public async initialLoad(
    sourceId: string,
    batch: BatchUpdateDocuments,
    {createFields: createFields = true}: BatchUpdateDocumentsOptions = {}
  ) {
    if (createFields) {
      const analyser = new FieldAnalyser(this.platformClient);
      await analyser.add(batch.addOrUpdate);
      await this.createFields(analyser);
    }

    return this.singleBatch(
      this.streamChunkStrategy,
      sourceId,
      batch,
      createFields
    );
  }

  public async singleBatch(
    strategy: Strategy,
    sourceId: string,
    batch: BatchUpdateDocuments,
    createFields = true
  ) {
    if (createFields) {
      const analyser = new FieldAnalyser(this.platformClient);
      await analyser.add(batch.addOrUpdate);
      await this.createFields(analyser);
    }
    return strategy.doTheMagicSingleBatch(sourceId, batch);
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
    return this.multipleBatches(
      this.fileContainerStrategy,
      sourceId,
      filesOrDirectories,
      options
    );
  }

  public fullLoadFromFiles(
    sourceId: string,
    filesOrDirectories: string[],
    options?: BatchUpdateDocumentsFromFiles
  ) {
    return this.multipleBatches(
      this.streamChunkStrategy,
      sourceId,
      filesOrDirectories,
      options
    );
  }

  public async multipleBatches(
    strategy: Strategy,
    sourceId: string,
    filesOrDirectories: string[],
    options?: BatchUpdateDocumentsFromFiles
  ) {
    const defaultOptions = {
      maxConcurrent: 10,
      createFields: true,
    };
    const {createFields, maxConcurrent} = {
      ...defaultOptions,
      ...options,
    };
    const files = getAllJsonFilesFromEntries(filesOrDirectories);

    if (createFields) {
      const analyser = new FieldAnalyser(this.platformClient);
      for (const filePath of files.values()) {
        const docBuilders =
          parseAndGetDocumentBuilderFromJSONDocument(filePath);
        await analyser.add(docBuilders);
      }
      await this.createFields(analyser);
    }

    return strategy.doTheMagic(sourceId, files, {maxConcurrent});
  }

  private get fileContainerStrategy() {
    return new FileContainerStrategy(
      this.organizationid,
      this.apikey,
      this.options
    );
  }

  private get streamChunkStrategy() {
    return new StreamChunkStrategy(
      this.organizationid,
      this.apikey,
      this.options
    );
  }

  private async createFields(analyser: FieldAnalyser) {
    const {fields, inconsistencies} = analyser.report();

    if (inconsistencies.size > 0) {
      throw new FieldTypeInconsistencyError(inconsistencies);
    }
    await createFields(this.platformClient, fields);
  }
}
