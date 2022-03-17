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
import {DocumentBuilder} from './documentBuilder';
import dayjs = require('dayjs');
import {URL} from 'url';
import {consumeGenerator} from './help/generator';
import {parseAndGetDocumentBuilderFromJSONDocument} from './validation/parseFile';
import {basename} from 'path';
import {getAllJsonFilesFromEntries} from './help/file';
import {
  castEnvironmentToPlatformClient,
  DEFAULT_ENVIRONMENT,
  DEFAULT_REGION,
  platformUrl,
  PlatformUrlOptions,
} from './environment';
import {FieldAnalyser} from './fieldAnalyser/fieldAnalyser';
import {FieldTypeInconsistencyError} from './errors/fieldErrors';
import {createFields} from './fieldAnalyser/fieldUtils';
import {SecurityIdentity} from './source/securityIdenty';

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

interface FileContainerResponse {
  uploadUri: string;
  fileId: string;
  requiredHeaders: Record<string, string>;
}

/**
 * Manage a push source.
 *
 * Allows you to create a new push source, manage security identities and documents in a Coveo organization.
 */
export class Source {
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
    options?: PlatformUrlOptions
  ) {
    this.options = {...Source.defaultOptions, ...options};
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
    const addURL = new URL(this.getBaseAPIURLForDocuments(sourceID));
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
    if (createFields) {
      const analyser = new FieldAnalyser(this.platformClient);
      await analyser.add(batch.addOrUpdate);
      await this.createFields(analyser);
    }

    const fileContainer = await this.createFileContainer();
    await this.uploadContentToFileContainer(fileContainer, batch);
    return this.pushFileContainerContent(sourceID, fileContainer);
  }

  /**
   *
   * Manage batches of items in a push source from a list of JSON files. See [Manage Batches of Items in a Push Source](https://docs.coveo.com/en/90)
   * @param {string} sourceID The unique identifier of the target Push source
   * @param {string[]} filesOrDirectories A list of JSON files or directories (containing JSON files) from which to extract documents.
   * @param {UploadBatchCallback} callback Callback executed when a batch of documents is either successfully uploaded or when an error occurs during the upload
   * @param {BatchUpdateDocumentsFromFiles} options
   */
  public async batchUpdateDocumentsFromFiles(
    sourceID: string,
    filesOrDirectories: string[],
    callback: UploadBatchCallback,
    options?: BatchUpdateDocumentsFromFiles
  ) {
    const defaultOptions = {
      maxConcurrent: 10,
      createFields: true,
    };
    const {maxConcurrent, createFields: createFields} = {
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

    const fileNames = files.map((path) => basename(path));
    const {chunksToUpload, close} = this.splitByChunkAndUpload(
      sourceID,
      fileNames,
      callback
    );

    if (createFields) {
      const analyser = new FieldAnalyser(this.platformClient);
      for (const filePath of files.values()) {
        const docBuilders =
          parseAndGetDocumentBuilderFromJSONDocument(filePath);
        await analyser.add(docBuilders);
      }
      await this.createFields(analyser);
    }

    // parallelize uploads within the same file
    const docBuilderGenerator = function* (docBuilders: DocumentBuilder[]) {
      for (const upload of chunksToUpload(docBuilders)) {
        yield upload();
      }
    };

    // parallelize uploads across multiple files
    const fileGenerator = function* () {
      for (const filePath of files.values()) {
        const docBuilders =
          parseAndGetDocumentBuilderFromJSONDocument(filePath);
        yield* docBuilderGenerator(docBuilders);
      }
    };

    await consumeGenerator(fileGenerator.bind(this), maxConcurrent);
    await close();
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
    const deleteURL = new URL(this.getBaseAPIURLForDocuments(sourceID));
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
      `${this.getBaseAPIURLForDocuments(sourceID)}/olderthan`
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
    const urlStatus = new URL(`${this.baseAPIURL}/sources/${sourceID}/status`);
    urlStatus.searchParams.append('statusType', status);
    return axios.post(urlStatus.toString(), {}, this.documentsAxiosConfig);
  }

  private get baseAPIURL() {
    return `${platformUrl(this.options)}/${this.organizationid}`;
  }

  private getBaseAPIURLForDocuments(sourceID: string) {
    return `${this.baseAPIURL}/sources/${sourceID}/documents`;
  }

  private get documentsAxiosConfig(): AxiosRequestConfig {
    return {
      headers: this.documentsRequestHeaders,
    };
  }

  private async createFields(analyser: FieldAnalyser) {
    const {fields, inconsistencies} = analyser.report();

    if (inconsistencies.size > 0) {
      throw new FieldTypeInconsistencyError(inconsistencies);
    }
    await createFields(this.platformClient, fields);
  }

  private getFileContainerAxiosConfig(
    fileContainer: FileContainerResponse
  ): AxiosRequestConfig {
    return {
      headers: fileContainer.requiredHeaders,
    };
  }

  private get documentsRequestHeaders() {
    return {
      ...this.authorizationHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private get authorizationHeader() {
    return {
      Authorization: `Bearer ${this.apikey}`,
    };
  }

  private async createFileContainer() {
    const fileContainerURL = new URL(`${this.baseAPIURL}/files`);
    const res = await axios.post(
      fileContainerURL.toString(),
      {},
      this.documentsAxiosConfig
    );
    return res.data as FileContainerResponse;
  }

  private async uploadContentToFileContainer(
    fileContainer: FileContainerResponse,
    batch: BatchUpdateDocuments
  ) {
    const uploadURL = new URL(fileContainer.uploadUri);
    return await axios.put(
      uploadURL.toString(),
      {
        addOrUpdate: batch.addOrUpdate.map((docBuilder) =>
          docBuilder.marshal()
        ),
        delete: batch.delete,
      },
      this.getFileContainerAxiosConfig(fileContainer)
    );
  }

  private pushFileContainerContent(
    sourceID: string,
    fileContainer: FileContainerResponse
  ) {
    const pushURL = new URL(
      `${this.getBaseAPIURLForDocuments(sourceID)}/batch`
    );
    pushURL.searchParams.append('fileId', fileContainer.fileId);
    return axios.put(pushURL.toString(), {}, this.documentsAxiosConfig);
  }

  private splitByChunkAndUpload(
    sourceID: string,
    fileNames: string[],
    callback: UploadBatchCallback,
    accumulator = this.accumulator
  ) {
    const chunksToUpload = (documentBuilders: DocumentBuilder[]) => {
      const batchesToUpload: Array<() => Promise<void>> = [];

      for (const docBuilder of documentBuilders) {
        const sizeOfDoc = Buffer.byteLength(
          JSON.stringify(docBuilder.marshal())
        );

        if (accumulator.size + sizeOfDoc >= Source.maxContentLength) {
          const chunks = accumulator.chunks;
          if (chunks.length > 0) {
            batchesToUpload.push(() =>
              this.uploadBatch(sourceID, chunks, fileNames, callback)
            );
          }
          accumulator.chunks = [docBuilder];
          accumulator.size = sizeOfDoc;
        } else {
          accumulator.size += sizeOfDoc;
          accumulator.chunks.push(docBuilder);
        }
      }
      return batchesToUpload;
    };
    const close = async () => {
      await this.uploadBatch(sourceID, accumulator.chunks, fileNames, callback);
    };
    return {chunksToUpload, close};
  }

  private async uploadBatch(
    sourceID: string,
    batch: DocumentBuilder[],
    fileNames: string[],
    callback: UploadBatchCallback
  ) {
    try {
      const res = await this.batchUpdateDocuments(
        sourceID,
        {
          addOrUpdate: batch,
          delete: [],
        },
        {createFields: false}
      );
      callback(null, {
        files: fileNames,
        batch,
        res,
      });
    } catch (e: unknown) {
      callback(e, {
        files: fileNames,
        batch,
      });
    }
  }

  private get accumulator(): {size: number; chunks: DocumentBuilder[]} {
    return {
      size: 0,
      chunks: [],
    };
  }
}
