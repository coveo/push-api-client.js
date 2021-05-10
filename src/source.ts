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
    return axios.put(
      `${this.getBaseAPIURL(sourceID)}${this.queryStringParams({
        documentId: doc.uri,
      })}`,
      docBuilder.marshal(),
      this.axiosConfig
    );
  }

  public deleteDocument(
    sourceID: string,
    documentId: string,
    deleteChildren = false
  ) {
    return axios.delete(
      `${this.getBaseAPIURL(sourceID)}${this.queryStringParams({
        documentId,
        deleteChildren,
      })}`,
      this.axiosConfig
    );
  }

  public deleteDocumentsOlderThan(
    sourceID: string,
    olderThan: Date | string | number
  ) {
    const date = dayjs(olderThan);
    return axios.delete(
      `${this.getBaseAPIURL(sourceID)}/olderthan${this.queryStringParams({
        orderingId: date.unix(),
      })}`,
      this.axiosConfig
    );
  }

  private queryStringParams(params: Record<string, string | boolean | number>) {
    return `?${Object.entries(params).map(
      ([k, v]) => `${k}=${encodeURIComponent(v)}`
    )}`;
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
