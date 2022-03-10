require('isomorphic-fetch');
require('abortcontroller-polyfill');

import {
  PlatformClient,
  SourceType,
  SourceVisibility,
} from '@coveord/platform-client';
export {SourceVisibility} from '@coveord/platform-client';
import {getAllJsonFilesFromEntries} from '../help/file';
import {
  castEnvironmentToPlatformClient,
  DEFAULT_ENVIRONMENT,
  DEFAULT_REGION,
  PlatformUrlOptions,
} from '../environment';
import {FieldAnalyser} from '../fieldAnalyser/fieldAnalyser';
import {FieldTypeInconsistencyError} from '../errors/fieldErrors';
import {createFields} from '../fieldAnalyser/fieldUtils';
import {SecurityIdentityManager} from './securityIdentityManager';
import {StreamChunkStrategy} from '../uploadStrategy/streamStrategy';
import {
  FileContainerStrategy,
  Strategy,
} from '../uploadStrategy/fileContainerStrategy';
import {
  BatchUpdateDocuments,
  BatchUpdateDocumentsFromFiles,
  BatchUpdateDocumentsOptions,
} from './interfaces';

/**
 * Manage a push source.
 *
 * Allows you to create a new push source, manage security identities and documents in a Coveo organization.
 */
export class PushSource {
  private securityIdentityManager: SecurityIdentityManager;
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
    options: PlatformUrlOptions = PushSource.defaultOptions
  ) {
    this.options = {...PushSource.defaultOptions, ...options};
    this.platformClient = new PlatformClient({
      accessToken: this.apikey,
      environment: castEnvironmentToPlatformClient(this.options.environment),
      organizationId: this.organizationid,
      region: this.options.region,
    });
    this.securityIdentityManager = new SecurityIdentityManager(
      this.platformClient,
      options
    );
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
    if (createFields) {
      const analyser = new FieldAnalyser(this.platformClient);
      await analyser.add(batch.addOrUpdate);
      await this.createFields(analyser);
    }

    return this.fileContainerStrategy.doTheMagicSingleBatch(sourceId, batch);
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

    this.singleBatch(sourceId, batch, this.streamChunkStrategy, this.create);
  }

  public async singleBatch(
    sourceId: string,
    batch: BatchUpdateDocuments,
    strategy: Strategy,
    createFields = true
  ) {
    if (createFields) {
      const analyser = new FieldAnalyser(this.platformClient);
      await analyser.add(batch.addOrUpdate);
      await this.createFields(analyser);
    }
    strategy.doTheMagicSingleBatch(sourceId, batch);
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
    const strategy = new FileContainerStrategy();
    const files = getAllJsonFilesFromEntries(filesOrDirectories);
    if (createFields) {
      // ...
    }

    return strategy.doTheMagic(sourceId, files);
  }

  public fullLoadFromFiles(
    sourceId: string,
    filesOrDirectories: string[],
    options?: BatchUpdateDocumentsFromFiles
  ) {
    const files = getAllJsonFilesFromEntries(filesOrDirectories);
    if (createFields) {
      // ...
    }
    this.multipleBatches(
      sourceId,
      filesOrDirectories,
      this.streamChunkStrategy,
      options
    );
  }

  public multipleBatches(
    sourceId: string,
    filesOrDirectories: string[],
    strategy: Strategy,
    options?: BatchUpdateDocumentsFromFiles
  ) {
    const files = getAllJsonFilesFromEntries(filesOrDirectories);
    if (createFields) {
      // ...
    }
    strategy.doTheMagic(sourceId, files);
  }

  // public async sourceContainsDocuments(): Promise<boolean> {
  //   // useful to know if should return an error when a user tries to udpate a source before doing a full load
  //   throw new Error('TODO:');
  //   throw new Error(
  //     `no documents detected for this source. You probably want to perform an full catalog uplaod first.`
  //   );
  // }

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
