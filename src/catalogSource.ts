require('isomorphic-fetch');
require('abortcontroller-polyfill');

import {
  //   CreateSourceModel,
  PlatformClient,
  //   SecurityIdentityAliasModel,
  //   SecurityIdentityBatchConfig,
  //   SecurityIdentityDelete,
  //   SecurityIdentityDeleteOptions,
  //   SecurityIdentityModel,
  SourceType,
  SourceVisibility,
} from '@coveord/platform-client';
export {SourceVisibility} from '@coveord/platform-client';
import axios, {AxiosRequestConfig, AxiosResponse} from 'axios';
import {DocumentBuilder} from './documentBuilder';
// import dayjs = require('dayjs');
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
import {FileContainerResponse} from './source';

export type SourceStatus = 'REBUILD' | 'REFRESH' | 'INCREMENTAL' | 'IDLE';
export enum SupportedSourceType {
  PUSH = SourceType.PUSH,
  CATALOG = SourceType.CATALOG,
}

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

export interface BatchUpdateDocumentsFromFiles {
  /**
   * The maximum number of requests to send concurrently to the Coveo platform.
   * Increasing this value will increase the speed at which documents are pushed but will also consume more memory.
   *
   * The default value is set to 10.
   */
  maxConcurrent?: number;
}

interface StreamResponse extends FileContainerResponse {
  streamId: string;
}

function makeid(length: number) {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/**
 * Manage a push source.
 *
 * Allows you to create a new push source, manage security identities and documents in a Coveo organization.
 */
export class CatalogSource {
  private platformClient: PlatformClient;
  private options: Required<PlatformUrlOptions>;
  private static defaultOptions: Required<PlatformUrlOptions> = {
    region: DEFAULT_REGION,
    environment: DEFAULT_ENVIRONMENT,
  };
  // TODO: should be 256 * 1024 * 1024 for stream
  private static maxContentLength = 156 * 1024 * 1024;
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
  }

  /**
   * Create a new push source
   * @param name The name of the source to create.
   * @param sourceVisibility The security option that should be applied to the content of the source. See [Content Security](https://docs.coveo.com/en/1779).
   * @returns
   */
  public create(name: string, sourceVisibility: SourceVisibility) {
    return this.platformClient.source.create({
      sourceType: SourceType.CATALOG,
      streamEnabled: true,
      name,
      sourceVisibility,
    });
  }

  /**
   * Adds or updates an individual item in a push source. See [Adding a Single Item in a Push Source](https://docs.coveo.com/en/133).
   * @param sourceID
   * @param docBuilder
   * @returns
   */
  public addOrUpdateDocument(sourceID: string, docBuilder: DocumentBuilder) {
    //   TODO: should update
    // const doc = docBuilder.build();
    // const addURL = new URL(this.getBaseAPIURLForStream(sourceID));
    // addURL.searchParams.append('documentId', doc.uri);
    // return axios.put(
    //   addURL.toString(),
    //   docBuilder.marshal(),
    //   this.documentsAxiosConfig
    // );
  }

  /**
   * Does a full Catalog uplaod and [Full Catalog upload](https://docs.coveo.com/en/2956/coveo-for-commerce/index-commerce-catalog-content-with-the-stream-api#step-4-stream-your-catalog-data-to-your-source).
   * TODO: check if it really deletes all documents
   * @param sourceID
   * @param batch
   * @returns
   */
  public async batchUploadDocuments(
    sourceID: string,
    batch: BatchUpdateDocuments
  ) {
    const fileContainer = await this.openStream(sourceID);
    // TODO: support larger chunks
    await this.uploadContentToStream(fileContainer, batch);
    return this.closeStream(fileContainer.streamId, sourceID);
  }

  /**
   * https://docs.coveo.com/en/l62e0540/coveo-for-commerce/update-your-catalog-source#step-2-upload-the-content-update-into-the-file-container
   *
   * @param {string} sourceID
   * @param {BatchUpdateDocuments} batch
   * @return {*}
   */
  public async batchUpdateDocuments(
    sourceID: string,
    batch: BatchUpdateDocuments,
    resetCatalog = false // or something like that
  ) {
    //   TODO:
    // Create a source instance and use batch update document
    // Only thing to change is getBaseAPIURLForDocuments from
    // - return `${this.baseAPIURL}/sources/${sourceID}/documents`; .../batch
    // - return `${this.baseAPIURL}/sources/${sourceID}/stream`; ... /update
    const fileContainer = await this.createFileContainer();
    await this.uploadContentToFileContainer(fileContainer, batch);
    return this.pushFileContainerContent(sourceID, fileContainer);
  }

  public async batchUploadDocumentsFromFiles(
    sourceID: string,
    filesOrDirectories: string[],
    callback: UploadBatchCallback,
    {maxConcurrent = 1}: BatchUpdateDocumentsFromFiles = {}
  ) {
    console.log('open stream');
    // const fileContainer = await this.openStream(sourceID);
    const fileContainer = {
      fileId: makeid(10),
      streamId: makeid(10),
      uploadUri: makeid(10),
      requiredHeaders: {},
    };

    console.log('get all files');
    const files = getAllJsonFilesFromEntries(filesOrDirectories);
    const fileNames = files.map((path) => basename(path));
    console.log('get all chunks');
    const {chunksToUpload, close} = this.splitByChunkAndUpload(
      sourceID,
      fileContainer,
      fileNames,
      callback
    );

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

    console.log('close stream');
    return this.closeStream(fileContainer.streamId, sourceID);
  }

  /**
   *
   * Manage batches of items in a push source from a list of JSON files. See [Manage Batches of Items in a Push Source](https://docs.coveo.com/en/90)
   * @param {string} sourceID The unique identifier of the target Push source
   * @param {string[]} filesOrDirectories A list of JSON files or directories (containing JSON files) from which to extract documents.
   * @param {UploadBatchCallback} callback Callback executed when a batch of documents is either successfully uploaded or when an error occurs during the upload
   * @param {BatchUpdateDocumentsFromFiles} [{maxConcurrent = 10}={}]
   */
  //   public async batchUpdateDocumentsFromFiles(
  //     sourceID: string,
  //     filesOrDirectories: string[],
  //     callback: UploadBatchCallback,
  //     {maxConcurrent = 1}: BatchUpdateDocumentsFromFiles = {}
  //   ) {
  //     const files = getAllJsonFilesFromEntries(filesOrDirectories);
  //     const fileNames = files.map((path) => basename(path));
  //     const chunksToUpload = this.splitByChunkAndUpload(
  //       sourceID,
  //       fileContainer,
  //       fileNames,
  //       callback
  //     );

  //     // parallelize uploads within the same file
  //     const docBuilderGenerator = function* (docBuilders: DocumentBuilder[]) {
  //       for (const upload of chunksToUpload(docBuilders)) {
  //         yield upload();
  //       }
  //     };

  //     // parallelize uploads across multiple files
  //     const fileGenerator = function* () {
  //       for (const filePath of files.values()) {
  //         const docBuilders =
  //           parseAndGetDocumentBuilderFromJSONDocument(filePath);
  //         yield* docBuilderGenerator(docBuilders);
  //       }
  //     };

  //     await consumeGenerator(fileGenerator.bind(this), maxConcurrent);
  //   }

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
    //   TODO:
    // const deleteURL = new URL(this.getBaseAPIURLForStream(sourceID));
    // deleteURL.searchParams.append('documentId', documentId);
    // deleteURL.searchParams.append('deleteChildren', `${deleteChildren}`);
    // return axios.delete(deleteURL.toString(), this.documentsAxiosConfig);
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
    //   TODO: not sure that is supported
    // const date = dayjs(olderThan);
    // const deleteURL = new URL(
    //   `${this.getBaseAPIURLForStream(sourceID)}/olderthan`
    // );
    // deleteURL.searchParams.append('orderingId', `${date.valueOf()}`);
    // return axios.delete(deleteURL.toString(), this.documentsAxiosConfig);
  }

  private get baseAPIURL() {
    return `${platformUrl(this.options)}/${this.organizationid}`;
  }

  private getBaseAPIURLForStream(sourceID: string) {
    return `${this.baseAPIURL}/sources/${sourceID}/stream`;
  }

  private get documentsAxiosConfig(): AxiosRequestConfig {
    return {
      headers: this.documentsRequestHeaders,
    };
  }

  private getFileContainerAxiosConfig(
    fileContainer: StreamResponse | FileContainerResponse
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
    const pushURL = new URL(`${this.getBaseAPIURLForStream(sourceID)}/update`);
    pushURL.searchParams.append('fileId', fileContainer.fileId);
    return axios.put(pushURL.toString(), {}, this.documentsAxiosConfig);
  }

  private async openStream(sourceID: string) {
    const streamUrl = new URL(`${this.getBaseAPIURLForStream(sourceID)}/open`);
    const res = await axios.post(
      streamUrl.toString(),
      {},
      this.documentsAxiosConfig
    );
    return res.data as StreamResponse;
  }

  private async uploadContentToStream(
    fileContainer: StreamResponse,
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

  private async getStreamChunk(streamID: string, sourceID: string) {
    const streamUrl = new URL(
      `${this.getBaseAPIURLForStream(sourceID)}/${streamID}`
    );
    const res = await axios.post(
      streamUrl.toString(),
      {},
      this.documentsAxiosConfig
    );
    return res.data as StreamResponse;
  }

  private async closeStream(streamID: string, sourceID: string) {
    const streamUrl = new URL(
      `${this.getBaseAPIURLForStream(sourceID)}/${streamID}/close`
    );
    const res = await axios.post(
      streamUrl.toString(),
      {},
      this.documentsAxiosConfig
    );
    return res.data as StreamResponse;
  }

  private splitByChunkAndUpload(
    sourceID: string,
    fileContainer: StreamResponse,
    fileNames: string[],
    callback: UploadBatchCallback,
    accumulator = this.accumulator
  ) {
    const chunksToUpload = (documentBuilders: DocumentBuilder[]) => {
      const batchesToUpload: Array<() => Promise<void>> = [];
      // TODO: handle initial push
      // let initialPush = true;

      for (const docBuilder of documentBuilders) {
        const sizeOfDoc = Buffer.byteLength(
          JSON.stringify(docBuilder.marshal())
        );

        if (accumulator.size + sizeOfDoc >= CatalogSource.maxContentLength) {
          const chunks = accumulator.chunks;
          if (chunks.length > 0) {
            console.log(' -> Push to batch');
            batchesToUpload.push(async () => {
              fileContainer = await this.getNewStreamChunk(
                fileContainer.streamId,
                sourceID
              );
              return this.uploadBatch(
                fileContainer,
                chunks,
                fileNames,
                callback
              );
            });
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
      console.log('---- Close');
      //   TODO: handle initial push
      //   if (!initialPush) {
      //     console.log('last initialPush: ' + initialPush);
      //     fileContainer = await this.getNewStreamChunk();
      //   }
      fileContainer = await this.getNewStreamChunk();
      return this.uploadBatch(
        fileContainer,
        accumulator.chunks,
        fileNames,
        callback
      );
    };
    return {chunksToUpload, close};
  }

  private async getNewStreamChunk(
    streamID: string,
    sourceID: string
  ): Promise<StreamResponse> {
    // return this.getStreamChunk(fileContainer.streamId, sourceID);
    return {
      fileId: makeid(10),
      streamId: makeid(10),
      uploadUri: makeid(10),
      requiredHeaders: {},
    };
  }

  private async uploadBatch(
    filecontainer: StreamResponse,
    batch: DocumentBuilder[],
    fileNames: string[],
    callback: UploadBatchCallback
  ) {
    try {
      console.log('New File container: ' + filecontainer.streamId);
      //   const res = await this.uploadContentToStream(filecontainer, {
      //     addOrUpdate: batch,
      //     delete: [],
      //   });

      const res: any = await new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve({status: 200, statusText: 'All good'});
        }, 500);
      });
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
