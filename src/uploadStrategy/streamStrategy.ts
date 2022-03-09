import axios, {AxiosRequestConfig, AxiosResponse} from 'axios';
import {URL} from 'url';
import {BatchUpdateDocuments, DocumentBuilder} from '..';
import {platformUrl} from '../environment';
import {FileContainerResponse} from '../source/baseSource';
import {BatchConsumer} from './chunkSPlitter';

export interface StreamResponse extends FileContainerResponse {
  streamId: string;
}

export interface Strategy {
  // doTheMagic --> shoulbe called uploadFromFile
  upload: (batch: BatchUpdateDocuments) => Promise<AxiosResponse<any, any>>;
}

// TODO: rename
// TODO: make static or functions
export class StreamChunkStrategy implements Strategy {
  private streamId: string | undefined;
  private batchConsumer: BatchConsumer;
  public constructor(private sourceId: string) {
    this.batchConsumer = new BatchConsumer(this); // TODO: find a way to define the stream ID
  }

  public doTheMagic(files: string[]) {
    const {onBatchError, onBatchUpload, done} =
      this.batchConsumer.consume(files);
    const closeStreamPromise = this.closeStream(); // close opened Stream

    return {
      onBatchError,
      onBatchUpload,
      done: Promise.all([closeStreamPromise, done]),
    };
  }

  public async doTheMagicSingleBatch(batch: BatchUpdateDocuments) {
    await this.upload(batch);
    await this.closeStream();
  }

  public async upload(batch: BatchUpdateDocuments) {
    const {streamId} = await this.openNewStream(); // openNewStreamIfnecessary
    const chunk = await this.requestStreamChunk(streamId);
    return this.uploadToStreamChunk(chunk, batch); // TODO: maybe rename
  }

  public async openNewStream(): Promise<StreamResponse> {
    const openStreamUrl = new URL(
      `${this.getBaseAPIURLForDocuments(this.sourceId)}/open`
    );

    const res: StreamResponse = await axios.post(
      openStreamUrl.toString(),
      {},
      this.documentsAxiosConfig
    );

    this.streamId = res.streamId; // TODO:mmmh

    return res;
  }

  public async closeStream() {
    //   Depends on streamid
    const openStreamUrl = new URL(
      `${this.getBaseAPIURLForDocuments(this.sourceId)}/close`
    );

    return axios.post(openStreamUrl.toString(), {}, this.documentsAxiosConfig);
  }

  private async requestStreamChunk(streamId: string): Promise<StreamResponse> {
    //   This will require
    this.documentsAxiosConfig;
    throw new Error('TODO:');
  }

  private async uploadToStreamChunk(
    //   TODO: this is a duplicate method of the filecontainer
    fileContainer: StreamResponse,
    batch: BatchUpdateDocuments
  ) {
    const uploadURL = new URL(fileContainer.uploadUri);
    return await axios.put(
      uploadURL.toString(),
      {
        addOrUpdate: batch.addOrUpdate.map((docBuilder) =>
          docBuilder.marshal()
        ),
        delete: batch.delete,
      },
      this.getFileContainerAxiosConfig(fileContainer)
    );
  }

  private getFileContainerAxiosConfig(
    fileContainer: FileContainerResponse
  ): AxiosRequestConfig {
    return {
      headers: fileContainer.requiredHeaders,
    };
  }
}
