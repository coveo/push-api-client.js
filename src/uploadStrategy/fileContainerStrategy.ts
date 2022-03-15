import axios, {AxiosRequestConfig} from 'axios';
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
    private apiThingy: UrlBuilder,
    private documentsAxiosConfig: AxiosRequestConfig
  ) {}

  public async doTheMagic(
    files: string[],
    processingConfig: Required<ConcurrentProcessing>
  ) {
    // TODO: remove lasy arrow if possible and use bind
    const upload = (batch: BatchUpdateDocuments) => this.upload(batch);
    const batchConsumer = new FileConsumer(upload, processingConfig);
    const {onBatchError, onBatchUpload, promise} = batchConsumer.consume(files);

    return {
      onBatchError,
      onBatchUpload,
      done: () => promise,
    };
  }

  public async doTheMagicSingleBatch(batch: BatchUpdateDocuments) {
    return this.upload(batch);
  }

  /**
   * TODO: document
   * Manage batches of items in a push source. See [Manage Batches of Items in a Push Source](https://docs.coveo.com/en/90)
   */
  private async upload(batch: BatchUpdateDocuments) {
    const fileContainer = await this.createFileContainer();
    await uploadContentToFileContainer(fileContainer, batch);
    return this.pushFileContainerContent(fileContainer);
  }

  private async createFileContainer() {
    const fileContainerURL = this.apiThingy.fileContainerUrl.toString();
    const res = await axios.post<FileContainerResponse>(
      fileContainerURL,
      {},
      this.documentsAxiosConfig
    );
    return res.data;
  }

  private pushFileContainerContent(fileContainer: FileContainerResponse) {
    const pushURL = new URL(`${this.apiThingy.baseAPIURLForUpdate}/batch`);
    pushURL.searchParams.append('fileId', fileContainer.fileId);
    return axios.put(pushURL.toString(), {}, this.documentsAxiosConfig);
  }
}

abstract class UrlBuilder {
  public constructor(
    private organizationId: string,
    private apiKey: string,
    private options: Required<PlatformUrlOptions>
  ) {}
  protected get platformURL() {
    return `${platformUrl(this.options)}/${this.organizationId}`;
  }
  public get fileContainerUrl() {
    return new URL(`${this.platformURL}/files`);
  }
  public abstract get baseAPIURLForUpdate(): URL;
}

export class PushUrlBuilder extends UrlBuilder {
  public constructor(
    private sourceId: string,
    organizationId: string,
    apiKey: string,
    options: Required<PlatformUrlOptions>
  ) {
    super(organizationId, apiKey, options);
  }
  public get baseURL() {
    return new URL(`${this.platformURL}/sources/${this.sourceId}`);
  }
  public get baseAPIURLForUpdate() {
    return new URL(`${this.baseURL}/documents/batch`);
  }
}
export class StreamUrlBuilder extends UrlBuilder {
  public constructor(
    private sourceId: string,
    organizationId: string,
    apiKey: string,
    options: Required<PlatformUrlOptions>
  ) {
    super(organizationId, apiKey, options);
  }
  public get baseStreamURL() {
    return new URL(`${this.platformURL}/sources/${this.sourceId}/stream`);
  }
  public get baseAPIURLForUpdate() {
    return new URL(`${this.baseStreamURL}/update`);
  }
}
