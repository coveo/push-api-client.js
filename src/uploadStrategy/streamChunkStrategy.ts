import {URL} from 'url';
import {BatchUpdateDocuments} from '../interfaces';
import {UploadStrategy} from './strategy';
import {uploadContentToFileContainer} from '../help/fileContainer';
import {StreamUrlBuilder} from '../help/urlUtils';
import {APICore} from '../APICore';

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
    private api: APICore
  ) {}

  public async upload(batch: BatchUpdateDocuments) {
    const chunk = await this.requestStreamChunk();
    return uploadContentToFileContainer(chunk, batch);
  }

  public async preUpload() {
    await this.openStream();
  }

  public async postUpload() {
    await this.closeOpenedStream();
  }

  public async openStream() {
    const openStreamUrl = new URL(`${this.urlBuilder.baseStreamURL}/open`);
    const res = await this.api.post<StreamResponse>(openStreamUrl.toString());

    this._openedStream = res.data;
  }

  public async closeOpenedStream() {
    if (this._openedStream === null) {
      return;
    }
    const openStreamUrl = new URL(
      `${this.urlBuilder.baseStreamURL}/${this._openedStream.streamId}/close`
    );

    const res = await this.api.post(openStreamUrl.toString());
    this._openedStream = null;
    return res.data;
  }

  private async requestStreamChunk(): Promise<StreamResponse> {
    if (this._openedStream === null) {
      throw 'No open stream found';
    }

    const {streamId} = this._openedStream;
    const openStreamUrl = new URL(
      `${this.urlBuilder.baseStreamURL}/${streamId}/chunk`
    );

    const res = await this.api.post<StreamResponse>(openStreamUrl.toString());
    return res.data;
  }
}
