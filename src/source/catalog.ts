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
import {SecurityIdentityManager} from './baseSource';
import {StreamChunkStrategy} from '../uploadStrategy/streamStrategy';
import {FileContainerStrategy} from '../uploadStrategy/fileContainerStrategy';

export type SourceStatus = 'REBUILD' | 'REFRESH' | 'INCREMENTAL' | 'IDLE';

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
export interface UploadBatchCallbackData {
  files: string[];
  batch: DocumentBuilder[];
  res?: AxiosResponse;
}

export type UploadBatchCallback = (
  err: unknown | null,
  data: UploadBatchCallbackData
) => void;

export interface BatchUpdateDocumentsOptions {
  /**
   * Whether to create fields required in the index based on the document batch metadata.
   */
  createFields?: boolean;
}

export interface BatchUpdateDocumentsFromFiles
  extends BatchUpdateDocumentsOptions {
  /**
   * The maximum number of requests to send concurrently to the Coveo platform.
   * Increasing this value will increase the speed at which documents are pushed but will also consume more memory.
   *
   * The default value is set to 10.
   */
  maxConcurrent?: number;
}

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

    const strategy = new FileContainerStrategy(sourceId);
    return strategy.doTheMagicOneBatch(batch);
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

    const strategy = new StreamChunkStrategy(sourceId);
    await strategy.doTheMagicSingleBatch(batch);
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
      // ...
    }

    return strategy.doTheMagic(sourceId, files, callback);
  }

  public fullLoadFromFiles(
    sourceId: string,
    filesOrDirectories: string[],
    callback: UploadBatchCallback,
    options?: BatchUpdateDocumentsFromFiles
  ) {
    const strategy = new StreamChunkStrategy();
    const files = getAllJsonFilesFromEntries(filesOrDirectories);
    if (createFields) {
      // ...
    }

    return strategy.doTheMagic(files);
  }

  // public async sourceContainsDocuments(): Promise<boolean> {
  //   // useful to know if should return an error when a user tries to udpate a source before doing a full load
  //   throw new Error('TODO:');
  //   throw new Error(
  //     `no documents detected for this source. You probably want to perform an full catalog uplaod first.`
  //   );
  // }

  private get baseAPIURL() {
    return `${platformUrl(this.options)}/${this.organizationid}`;
  }

  private getBaseAPIURLForDocuments(sourceId: string) {
    return `${this.baseAPIURL}/sources/${sourceId}/documents`;
  }

  private async createFields(analyser: FieldAnalyser) {
    const {fields, inconsistencies} = analyser.report();

    if (inconsistencies.size > 0) {
      throw new FieldTypeInconsistencyError(inconsistencies);
    }
    await createFields(this.platformClient, fields);
  }
}
