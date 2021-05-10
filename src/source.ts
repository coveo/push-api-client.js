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
    const addURL = new URL(this.getBaseAPIURL(sourceID));
    addURL.searchParams.append('documentId', doc.uri);
    return axios.put(addURL.toString(), docBuilder.marshal(), this.axiosConfig);
  }

  public deleteDocument(
    sourceID: string,
    documentId: string,
    deleteChildren = false
  ) {
    const deleteURL = new URL(this.getBaseAPIURL(sourceID));
    deleteURL.searchParams.append('documentId', documentId);
    deleteURL.searchParams.append('deleteChildren', `${deleteChildren}`);
    return axios.delete(deleteURL.toString(), this.axiosConfig);
  }

  public deleteDocumentsOlderThan(
    sourceID: string,
    olderThan: Date | string | number
  ) {
    const date = dayjs(olderThan);
    const deleteURL = new URL(`${this.getBaseAPIURL(sourceID)}/olderthan`);
    deleteURL.searchParams.append('orderingId', `${date.valueOf()}`);
    return axios.delete(deleteURL.toString(), this.axiosConfig);
  }

  private getBaseAPIURL(sourceID: string) {
    return `https://api.cloud.coveo.com/push/v1/organizations/${this.organizationid}/sources/${sourceID}/documents`;
  }

  private get axiosConfig(): AxiosRequestConfig {
    return {
      headers: this.requestHeaders,
    };
  }

  private get requestHeaders() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${this.apikey}`,
    };
  }
}
