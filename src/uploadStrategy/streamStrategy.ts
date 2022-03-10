import axios from 'axios';
import {URL} from 'url';
import {BatchUpdateDocuments, ConcurrentProcessing} from '../interfaces';
import {platformUrl, PlatformUrlOptions} from '../environment';
import {Strategy} from './strategy';
import {
  FileConsumer,
  uploadContentToFileContainer,
  axiosRequestHeaders,
} from '../help';

export interface StreamResponse {
  uploadUri: string;
  fileId: string;
  requiredHeaders: Record<string, string>;
  streamId: string;
}

export class StreamChunkStrategy implements Strategy {
  public constructor(
    private organizationId: string,
    private apiKey: string,
    private options: Required<PlatformUrlOptions>
  ) {}

  // TODO: rename
  public async doTheMagic(
    sourceId: string,
    files: string[],
    processingConfig: Required<ConcurrentProcessing>
  ) {
    // TODO: check if can simplify by removing the arrow function
    const {streamId} = await this.openStream(sourceId);
    const upload = (batch: BatchUpdateDocuments) =>
      this.uploadWrapper(sourceId, streamId)(batch);
    const batchConsumer = new FileConsumer(upload, processingConfig);
    const {onBatchError, onBatchUpload, promise} = batchConsumer.consume(files);

    const endPromise = async () => {
      await promise;
      await this.closeStream(sourceId, streamId);
    };

    const done = endPromise();

    return {
      onBatchError,
      onBatchUpload,
      done: () => done,
    };
  }

  // TODO: rename
  public async doTheMagicSingleBatch(
    sourceId: string,
    batch: BatchUpdateDocuments
  ) {
    const {streamId} = await this.openStream(sourceId);
    await this.uploadWrapper(sourceId, streamId)(batch);
    return this.closeStream(sourceId, streamId);
  }

  private uploadWrapper(sourceId: string, streamId: string) {
    // TODO: rename
    return async (batch: BatchUpdateDocuments) => {
      const chunk = await this.requestStreamChunk(sourceId, streamId);
      return uploadContentToFileContainer(chunk, batch);
    };
  }

  private async openStream(sourceId: string): Promise<StreamResponse> {
    const openStreamUrl = new URL(`${this.baseAPIURLForStream(sourceId)}/open`);
    return await axios.post(
      openStreamUrl.toString(),
      {},
      this.documentsAxiosConfig
    );
  }

  private async closeStream(sourceId: string, streamId: string) {
    const openStreamUrl = new URL(
      `${this.baseAPIURLForStream(sourceId)}/${streamId}/close`
    );

    return axios.post(openStreamUrl.toString(), {}, this.documentsAxiosConfig);
  }

  private async requestStreamChunk(
    sourceId: string,
    streamId: string
  ): Promise<StreamResponse> {
    const openStreamUrl = new URL(
      `${this.baseAPIURLForStream(sourceId)}/${streamId}/chunk`
    );

    return axios.post(openStreamUrl.toString(), {}, this.documentsAxiosConfig);
  }

  private baseAPIURLForStream(sourceId: string) {
    return `${this.baseAPIURL}/sources/${sourceId}/stream`;
  }

  private get documentsAxiosConfig() {
    return axiosRequestHeaders(this.apiKey);
  }

  private get baseAPIURL() {
    return `${platformUrl(this.options)}/${this.organizationId}`;
  }
}
