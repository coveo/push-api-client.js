require('isomorphic-fetch');
require('abortcontroller-polyfill');

import {
  Environment,
  PlatformClient,
  SourceType,
  SourceVisibility,
} from '@coveord/platform-client';
export {Environment, SourceVisibility} from '@coveord/platform-client';
import axios, {AxiosRequestConfig} from 'axios';
import {DocumentBuilder} from './documentBuilder';
import dayjs = require('dayjs');
import {URL} from 'url';

export interface BatchUpdateDocuments {
  addOrUpdate: DocumentBuilder[];
  delete: {documentId: string; deleteChildren: boolean}[];
}

interface FileContainerResponse {
  uploadUri: string;
  fileId: string;
  requiredHeaders: Record<string, string>;
}

export class Source {
  private platformClient: PlatformClient;
  constructor(private apikey: string, private organizationid: string) {
    this.platformClient = new PlatformClient({
      accessToken: this.apikey,
      environment: Environment.prod,
      organizationId: this.organizationid,
    });
  }

  public create(name: string, sourceVisibility: SourceVisibility) {
    return this.platformClient.source.create({
      sourceType: SourceType.PUSH,
      pushEnabled: true,
      name,
      sourceVisibility,
    });
  }

  public createOrUpdateSecurityIdentityAlias() {
    // TODO;
  }

  public deleteSecurityIdentity() {
    // TODO;
  }

  public deleteOldSecurityIdentities() {
    // TODO;
  }

  public manageSecurityIdentities() {
    // TODO;
  }

  public addOrUpdateDocument(sourceID: string, docBuilder: DocumentBuilder) {
    const doc = docBuilder.build();
    const addURL = new URL(this.getBaseAPIURLForDocuments(sourceID));
    addURL.searchParams.append('documentId', doc.uri);
    return axios.put(
      addURL.toString(),
      docBuilder.marshal(),
      this.documentsAxiosConfig
    );
  }

  /**
   * Manage batches of items in a push source. See https://docs.coveo.com/en/90
   * @param sourceID
   * @param batch
   * @returns
   */
  public async batchUpdateDocuments(
    sourceID: string,
    batch: BatchUpdateDocuments
  ) {
    const fileContainer = await this.createFileContainer();
    await this.uploadContentToFileContainer(fileContainer, batch);
    return this.pushFileContainerContent(sourceID, fileContainer);
  }

  public deleteDocument(
    sourceID: string,
    documentId: string,
    deleteChildren = false
  ) {
    const deleteURL = new URL(this.getBaseAPIURLForDocuments(sourceID));
    deleteURL.searchParams.append('documentId', documentId);
    deleteURL.searchParams.append('deleteChildren', `${deleteChildren}`);
    return axios.delete(deleteURL.toString(), this.documentsAxiosConfig);
  }

  public deleteDocumentsOlderThan(
    sourceID: string,
    olderThan: Date | string | number
  ) {
    const date = dayjs(olderThan);
    const deleteURL = new URL(
      `${this.getBaseAPIURLForDocuments(sourceID)}/olderthan`
    );
    deleteURL.searchParams.append('orderingId', `${date.valueOf()}`);
    return axios.delete(deleteURL.toString(), this.documentsAxiosConfig);
  }

  private get baseAPIURL() {
    return `https://api.cloud.coveo.com/push/v1/organizations/${this.organizationid}`;
  }

  private getBaseAPIURLForDocuments(sourceID: string) {
    return `${this.baseAPIURL}/sources/${sourceID}/documents`;
  }

  private get documentsAxiosConfig(): AxiosRequestConfig {
    return {
      headers: this.documentsRequestHeaders,
    };
  }

  private getFileContainerAxiosConfig(
    fileContainer: FileContainerResponse
  ): AxiosRequestConfig {
    return {
      headers: fileContainer.requiredHeaders,
    };
  }

  private get documentsRequestHeaders() {
    return {
      ...this.authorizationHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private get authorizationHeader() {
    return {
      Authorization: `Bearer ${this.apikey}`,
    };
  }

  private async createFileContainer() {
    const fileContainerURL = new URL(`${this.baseAPIURL}/files`);
    const res = await axios.post(
      fileContainerURL.toString(),
      {},
      this.documentsAxiosConfig
    );
    return res.data as FileContainerResponse;
  }

  private async uploadContentToFileContainer(
    fileContainer: FileContainerResponse,
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

  private pushFileContainerContent(
    sourceID: string,
    fileContainer: FileContainerResponse
  ) {
    const pushURL = new URL(
      `${this.getBaseAPIURLForDocuments(sourceID)}/batch`
    );
    pushURL.searchParams.append('fileId', fileContainer.fileId);
    return axios.put(pushURL.toString(), {}, this.documentsAxiosConfig);
  }
}
