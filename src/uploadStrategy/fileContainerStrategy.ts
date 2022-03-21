import axios, {AxiosRequestConfig} from 'axios';
import {BatchUpdateDocuments, ConcurrentProcessing} from '../interfaces';
import {UploadStrategy} from './strategy';
import {uploadContentToFileContainer} from '../help/fileContainer';
import {FileConsumer} from '../help/fileConsumer';
import {URLBuilder} from '../help/urlUtils';
export interface FileContainerResponse {
  uploadUri: string;
  fileId: string;
  requiredHeaders: Record<string, string>;
}

/**
 * Upload documents using the [File container](https://docs.coveo.com/en/43/index-content/creating-a-file-container)
 *
 * @class FileContainerStrategy
 * @implements {UploadStrategy}
 */
export class FileContainerStrategy implements UploadStrategy {
  public constructor(
    private urlBuilder: URLBuilder,
    private documentsAxiosConfig: AxiosRequestConfig
  ) {}

  public async uploadFiles(
    files: string[],
    processingConfig: Required<ConcurrentProcessing>
  ) {
    const upload = (batch: BatchUpdateDocuments) => this.uploadBatch(batch);
    const batchConsumer = new FileConsumer(upload, processingConfig);
    return batchConsumer.consume(files);
  }

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
