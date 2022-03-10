import axios from 'axios';
import {URL} from 'url';
import {BatchUpdateDocuments} from '../source/interfaces';
import {platformUrl, PlatformUrlOptions} from '../environment';
import {axiosRequestHeaders} from '../source/axiosUtils';
import {BatchConsumer} from './chunkSPlitter';
import {uploadContentToFileContainer} from './fileContainerUtilis';
import {Strategy} from './fileContainerStrategy';

export interface StreamResponse {
  uploadUri: string;
  fileId: string;
  requiredHeaders: Record<string, string>;
  streamId: string;
}

// // TODO: remove circular deps by moving in its separate file
// export interface Strategy {
//   // doTheMagic --> shoulbe called uploadFromFile
//   upload: (batch: BatchUpdateDocuments) => Promise<AxiosResponse<any, any>>;
// }

// TODO: rename
// TODO: make static or functions
// export class StreamChunkStrategy implements Strategy {
export class StreamChunkStrategy implements Strategy {
  public constructor(
    private organizationId: string,
    private apiKey: string,
    private options: Required<PlatformUrlOptions>
  ) {}

  public async doTheMagic(sourceId: string, files: string[]) {
    // TODO: check if can simplify by removing the arrow function
    const streamId = await this.getNewStream(sourceId);
    const upload = (batch: BatchUpdateDocuments) =>
      this.uploadWrapper(sourceId, streamId)(batch);
    const batchConsumer = new BatchConsumer(upload);
    const {onBatchError, onBatchUpload, done} = batchConsumer.consume(files);
    const closeStreamPromise = this.closeStream(sourceId, streamId);

    const allPromises = () =>
      new Promise<void>((resolve, reject) => {
        Promise.all([closeStreamPromise, done()])
          .then(() => resolve())
          .catch((e) => reject(e));
      });

    return {
      onBatchError,
      onBatchUpload,
      done: allPromises,
    };
  }

  public async doTheMagicSingleBatch(
    sourceId: string,
    batch: BatchUpdateDocuments
  ) {
    const streamId = await this.getNewStream(sourceId); // openNewStreamIfnecessary
    await this.uploadWrapper(sourceId, streamId)(batch);
    await this.closeStream(sourceId, streamId);
  }

  private uploadWrapper(sourceId: string, streamId: string) {
    // TODO: rename
    return async (batch: BatchUpdateDocuments) => {
      const chunk = await this.requestStreamChunk(sourceId, streamId);
      return uploadContentToFileContainer(chunk, batch); // TODO: maybe rename
    };
  }

  private async getNewStream(sourceId: string): Promise<string> {
    const openStreamUrl = new URL(`${this.baseAPIURLForStream(sourceId)}/open`);
    const res: StreamResponse = await axios.post(
      openStreamUrl.toString(),
      {},
      this.documentsAxiosConfig
    );

    return res.streamId;
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
