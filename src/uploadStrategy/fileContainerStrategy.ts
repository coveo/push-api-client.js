import axios from 'axios';
import {URL} from 'url';
import {BatchUpdateDocuments, ConcurrentProcessing} from '../interfaces';
import {platformUrl, PlatformUrlOptions} from '../environment';
import {Strategy} from './strategy';
import {
  FileConsumer,
  axiosRequestHeaders,
  uploadContentToFileContainer,
} from '../help';

export interface FileContainerResponse {
  uploadUri: string;
  fileId: string;
  requiredHeaders: Record<string, string>;
}

// TODO: rename
export class FileContainerStrategy implements Strategy {
  public constructor(
    private organizationId: string,
    private apiKey: string,
    private options: Required<PlatformUrlOptions>
  ) {}

  public async doTheMagic(
    sourceId: string,
    files: string[],
    processingConfig: Required<ConcurrentProcessing>
  ) {
    const upload = (batch: BatchUpdateDocuments) =>
      this.uploadWrapper(sourceId)(batch);
    const batchConsumer = new FileConsumer(upload, processingConfig);
    const {onBatchError, onBatchUpload, promise} = batchConsumer.consume(files);

    return {
      onBatchError,
      onBatchUpload,
      done: () => promise,
    };
  }

  public async doTheMagicSingleBatch(
    sourceId: string,
    batch: BatchUpdateDocuments
  ) {
    return this.uploadWrapper(sourceId)(batch);
  }

  /**
   * Manage batches of items in a push source. See [Manage Batches of Items in a Push Source](https://docs.coveo.com/en/90)
   * @param sourceId
   * @param batch
   * @returns
   */
  private uploadWrapper(sourceId: string) {
    // TODO: rename
    return async (batch: BatchUpdateDocuments) => {
      const fileContainer = await this.createFileContainer();
      await uploadContentToFileContainer(fileContainer, batch);
      return this.pushFileContainerContent(sourceId, fileContainer);
    };
  }

  private async createFileContainer() {
    const fileContainerURL = new URL(`${this.baseAPIURL}/files`);
    const res = await axios.post<FileContainerResponse>(
      fileContainerURL.toString(),
      {},
      this.documentsAxiosConfig
    );
    return res.data;
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
