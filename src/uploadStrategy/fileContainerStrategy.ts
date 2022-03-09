import axios, {AxiosRequestConfig} from 'axios';
import {URL} from 'url';
import {BatchUpdateDocuments, DocumentBuilder, PlatformUrlOptions} from '..';
import {platformUrl} from '../environment';
import {UploadBatchCallback} from '../source/baseSource';
import {BatchConsumer} from './chunkSPlitter';

export interface FileContainerResponse {
  uploadUri: string;
  fileId: string;
  requiredHeaders: Record<string, string>;
}

export interface endpointOptions {
  baseUrl: string;
  updateUrl: string;
  axiosConfig: Object;
}

// TODO: rename
// TODO: make static
export class FileContainerStrategy {
  public constructor() {}

  public doTheMagic(
    sourceId: string,
    files: string[],
    callback: UploadBatchCallback // TODO: remove circular dep
  ) {
    const uploadMethod = (sourceId: string, batch: BatchUpdateDocuments) =>
      this.upload(sourceId, batch);

    return new BatchConsumer(uploadMethod).consume(sourceId, files, callback);
  }

  /**
   * Manage batches of items in a push source. See [Manage Batches of Items in a Push Source](https://docs.coveo.com/en/90)
   * @param sourceId
   * @param batch
   * @returns
   */
  public async upload(sourceId: string, batch: BatchUpdateDocuments) {
    const fileContainer = await this.createFileContainer();
    await this.uploadContentToFileContainer(fileContainer, batch);
    return this.pushFileContainerContent(sourceId, fileContainer);
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

  private getFileContainerAxiosConfig(
    fileContainer: FileContainerResponse
  ): AxiosRequestConfig {
    return {
      headers: fileContainer.requiredHeaders,
    };
  }

  private pushFileContainerContent(
    sourceId: string,
    fileContainer: FileContainerResponse
  ) {
    const pushURL = new URL(
      `${this.getBaseAPIURLForDocuments(sourceId)}/batch`
    );
    pushURL.searchParams.append('fileId', fileContainer.fileId);
    return axios.put(pushURL.toString(), {}, this.documentsAxiosConfig);
  }
}
