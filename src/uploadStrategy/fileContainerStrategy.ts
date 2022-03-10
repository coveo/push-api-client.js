import axios, {AxiosResponse} from 'axios';
import {URL} from 'url';
import {BatchUpdateDocuments} from '../source/interfaces';
import {platformUrl, PlatformUrlOptions} from '../environment';
import {BatchConsumer, ErrorCallback, SuccessCallback} from './chunkSPlitter';
import {axiosRequestHeaders} from '../source/axiosUtils';
import {uploadContentToFileContainer} from './fileContainerUtilis';

export interface FileContainerResponse {
  uploadUri: string;
  fileId: string;
  requiredHeaders: Record<string, string>;
}

export interface Strategy {
  doTheMagic: (
    sourceId: string,
    files: string[]
  ) => Promise<{
    onBatchError: (callback: ErrorCallback) => BatchConsumer;
    onBatchUpload: (callback: SuccessCallback) => BatchConsumer;
    done: () => Promise<void>;
  }>;
  doTheMagicSingleBatch: (
    sourceId: string,
    batch: BatchUpdateDocuments
  ) => void;
}

// TODO: rename
export class FileContainerStrategy implements Strategy {
  public constructor(
    private organizationId: string,
    private apiKey: string,
    private options: Required<PlatformUrlOptions>
  ) {}

  public async doTheMagic(sourceId: string, files: string[]) {
    const upload = (batch: BatchUpdateDocuments) =>
      this.uploadWrapper(sourceId)(batch);
    const batchConsumer = new BatchConsumer(upload);
    const {onBatchError, onBatchUpload, done} = batchConsumer.consume(files);

    return {
      onBatchError,
      onBatchUpload,
      done,
    };
  }

  public async doTheMagicSingleBatch(
    sourceId: string,
    batch: BatchUpdateDocuments
  ) {
    await this.uploadWrapper(sourceId)(batch);
  }

  /**
   * Manage batches of items in a push source. See [Manage Batches of Items in a Push Source](https://docs.coveo.com/en/90)
   * @param sourceId
   * @param batch
   * @returns
   */
  public uploadWrapper(sourceId: string) {
    // TODO: rename
    return async (batch: BatchUpdateDocuments) => {
      const fileContainer = await this.createFileContainer();
      await uploadContentToFileContainer(fileContainer, batch);
      return this.pushFileContainerContent(sourceId, fileContainer);
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

  private pushFileContainerContent(
    sourceId: string,
    fileContainer: FileContainerResponse
  ) {
    const pushURL = new URL(`${this.baseAPIURLForDocuments(sourceId)}/batch`);
    pushURL.searchParams.append('fileId', fileContainer.fileId);
    return axios.put(pushURL.toString(), {}, this.documentsAxiosConfig);
  }

  private baseAPIURLForDocuments(sourceId: string) {
    return `${this.baseAPIURL}/sources/${sourceId}/documents`;
  }

  private get documentsAxiosConfig() {
    return axiosRequestHeaders(this.apiKey);
  }

  private get baseAPIURL() {
    return `${platformUrl(this.options)}/${this.organizationId}`;
  }
}
