import axios, {AxiosRequestConfig} from 'axios';
import {URL} from 'url';
import {BatchUpdateDocuments, ConcurrentProcessing} from '../interfaces';
import {UploadStrategy} from './strategy';
import {FileConsumer} from '../help/fileConsumer';
import {uploadContentToFileContainer} from '../help/fileContainer';
import {StreamUrlBuilder} from '../help/urlUtils';

export interface StreamResponse {
  uploadUri: string;
  fileId: string;
  requiredHeaders: Record<string, string>;
  streamId: string;
}

/**
 * Upload documents using the [Stream API](https://docs.coveo.com/en/lb4a0344/coveo-for-commerce/how-to-stream-your-catalog-data-to-your-source)
 *
 * @class StreamChunkStrategy
 * @implements {UploadStrategy}
 */
export class StreamChunkStrategy implements UploadStrategy {
  public constructor(
    private urlBuilder: StreamUrlBuilder,
    private documentsAxiosConfig: AxiosRequestConfig
  ) {}

  public async uploadFiles(
    files: string[],
    processingConfig: Required<ConcurrentProcessing>
  ) {
    const {streamId} = await this.openStream();
    const upload = (batch: BatchUpdateDocuments) =>
      this.upload(streamId, batch);
    const batchConsumer = new FileConsumer(upload, processingConfig);
    const {onBatchError, onBatchUpload, done} = batchConsumer.consume(files);

    const endPromise = async () => {
      await done();
      await this.closeStream(streamId);
    };

    const doneDone = endPromise();

    return {
      onBatchError,
      onBatchUpload,
      done: () => doneDone,
    };
  }

  public async uploadBatch(batch: BatchUpdateDocuments) {
    const {streamId} = await this.openStream();
    await this.upload(streamId, batch);
    return this.closeStream(streamId);
  }

  private async upload(streamId: string, batch: BatchUpdateDocuments) {
    const chunk = await this.requestStreamChunk(streamId);
    return uploadContentToFileContainer(chunk, batch);
  }

  private async openStream() {
    const openStreamUrl = new URL(`${this.urlBuilder.baseStreamURL}/open`);
    const res = await axios.post<StreamResponse>(
      openStreamUrl.toString(),
      {},
      this.documentsAxiosConfig
    );

    return res.data;
  }

  private async closeStream(streamId: string) {
    const openStreamUrl = new URL(
      `${this.urlBuilder.baseStreamURL}/${streamId}/close`
    );

    const res = await axios.post(
      openStreamUrl.toString(),
      {},
      this.documentsAxiosConfig
    );

    return res.data;
  }

  private async requestStreamChunk(streamId: string) {
    const openStreamUrl = new URL(
      `${this.urlBuilder.baseStreamURL}/${streamId}/chunk`
    );

    const res = await axios.post<StreamResponse>(
      openStreamUrl.toString(),
      {},
      this.documentsAxiosConfig
    );
    return res.data;
  }
}
