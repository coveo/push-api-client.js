import axios, {AxiosRequestConfig} from 'axios';
import {URL} from 'url';
import {BatchUpdateDocuments, ConcurrentProcessing} from '../interfaces';
import {UploadStrategy} from './strategy';
import {FileConsumer, uploadContentToFileContainer} from '../help';
import {URLBuilder} from '../help/urlUtils';

export interface FileContainerResponse {
  uploadUri: string;
  fileId: string;
  requiredHeaders: Record<string, string>;
}

// TODO: rename
export class FileContainerStrategy implements UploadStrategy {
  public constructor(
    private urlBuilder: URLBuilder,
    private documentsAxiosConfig: AxiosRequestConfig
  ) {}

  public async uploadFiles(
    files: string[],
    processingConfig: Required<ConcurrentProcessing>
  ) {
    // TODO: remove lasy arrow if possible and use bind
    const upload = (batch: BatchUpdateDocuments) => this.uploadBatch(batch);
    const batchConsumer = new FileConsumer(upload, processingConfig);
    const {onBatchError, onBatchUpload, promise} = batchConsumer.consume(files);

    return {
      onBatchError,
      onBatchUpload,
      done: () => promise,
    };
  }

  /**
   * TODO: document
   * Manage batches of items in a push source. See [Manage Batches of Items in a Push Source](https://docs.coveo.com/en/90)
   */
  public async uploadBatch(batch: BatchUpdateDocuments) {
    const fileContainer = await this.createFileContainer();
    await uploadContentToFileContainer(fileContainer, batch);
    return this.pushFileContainerContent(fileContainer);
  }

  private async createFileContainer() {
    const fileContainerURL = this.urlBuilder.fileContainerUrl.toString();
    const res = await axios.post<FileContainerResponse>(
      fileContainerURL,
      {},
      this.documentsAxiosConfig
    );
    return res.data;
  }

  private pushFileContainerContent(fileContainer: FileContainerResponse) {
    const pushURL = this.urlBuilder.baseAPIURLForUpdate;
    pushURL.searchParams.append('fileId', fileContainer.fileId);
    return axios.put(pushURL.toString(), {}, this.documentsAxiosConfig);
  }
}
