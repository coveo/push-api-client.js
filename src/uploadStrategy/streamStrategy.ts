import axios, {AxiosRequestConfig} from 'axios';
import {URL} from 'url';
import {BatchUpdateDocuments, ConcurrentProcessing} from '../interfaces';
import {Strategy} from './strategy';
import {FileConsumer, uploadContentToFileContainer} from '../help';
import {StreamUrlBuilder} from '.';

export interface StreamResponse {
  uploadUri: string;
  fileId: string;
  requiredHeaders: Record<string, string>;
  streamId: string;
}

export class StreamChunkStrategy implements Strategy {
  public constructor(
    private apiThingy: StreamUrlBuilder,
    private documentsAxiosConfig: AxiosRequestConfig
  ) {}

  // TODO: rename
  public async doTheMagic(
    files: string[],
    processingConfig: Required<ConcurrentProcessing>
  ) {
    // TODO: check if can simplify by removing the arrow function
    const {streamId} = await this.openStream();
    const upload = (batch: BatchUpdateDocuments) =>
      this.upload(streamId, batch);
    const batchConsumer = new FileConsumer(upload, processingConfig);
    const {onBatchError, onBatchUpload, promise} = batchConsumer.consume(files);

    const endPromise = async () => {
      await promise;
      await this.closeStream(streamId);
    };

    const done = endPromise();

    return {
      onBatchError,
      onBatchUpload,
      done: () => done,
    };
  }

  // TODO: rename
  public async doTheMagicSingleBatch(batch: BatchUpdateDocuments) {
    const {streamId} = await this.openStream();
    await this.upload(streamId, batch);
    return this.closeStream(streamId);
  }

  private async upload(streamId: string, batch: BatchUpdateDocuments) {
    const chunk = await this.requestStreamChunk(streamId);
    return uploadContentToFileContainer(chunk, batch);
  }

  private async openStream(): Promise<StreamResponse> {
    const openStreamUrl = new URL(`${this.apiThingy.baseStreamURL}/open`);
    return await axios.post(
      openStreamUrl.toString(),
      {},
      this.documentsAxiosConfig
    );
  }

  private async closeStream(streamId: string) {
    const openStreamUrl = new URL(
      `${this.apiThingy.baseStreamURL}/${streamId}/close`
    );

    return axios.post(openStreamUrl.toString(), {}, this.documentsAxiosConfig);
  }

  private async requestStreamChunk(streamId: string): Promise<StreamResponse> {
    const openStreamUrl = new URL(
      `${this.apiThingy.baseStreamURL}/${streamId}/chunk`
    );

    return axios.post(openStreamUrl.toString(), {}, this.documentsAxiosConfig);
  }
}
