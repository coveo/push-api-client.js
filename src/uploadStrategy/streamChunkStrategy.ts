import axios, {AxiosRequestConfig} from 'axios';
import {URL} from 'url';
import {BatchUpdateDocuments} from '../interfaces';
import {UploadStrategy} from './strategy';
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
  private _openedStream: StreamResponse | null = null;
  public constructor(
    private urlBuilder: StreamUrlBuilder,
    private documentsAxiosConfig: AxiosRequestConfig
  ) {}

  public async upload(batch: BatchUpdateDocuments) {
    const chunk = await this.requestStreamChunk();
    return uploadContentToFileContainer(chunk, batch);
  }

  public postUpload() {
    return this.closeOpenedStream();
  }

  public async openStreamIfNotAlreadyOpen() {
    if (this._openedStream === null) {
      const openStreamUrl = new URL(`${this.urlBuilder.baseStreamURL}/open`);
      const res = await axios.post<StreamResponse>(
        openStreamUrl.toString(),
        {},
        this.documentsAxiosConfig
      );

      this._openedStream = res.data;
    }
    return this._openedStream;
  }

  public async closeOpenedStream() {
    if (this._openedStream === null) {
      return;
    }
    const openStreamUrl = new URL(
      `${this.urlBuilder.baseStreamURL}/${this._openedStream.streamId}/close`
    );

    const res = await axios.post(
      openStreamUrl.toString(),
      {},
      this.documentsAxiosConfig
    );
    this._openedStream = null;
    return res.data;
  }

  private async requestStreamChunk() {
    const {streamId} = await this.openStreamIfNotAlreadyOpen();
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
