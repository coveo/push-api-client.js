require('isomorphic-fetch');
require('abortcontroller-polyfill');

import {Document} from './document';
import {
  Environment,
  PlatformClient,
  SourceType,
  SourceVisibility,
} from '@coveord/platform-client';
export {Environment} from '@coveord/platform-client';
import axios from 'axios';

export class Source {
  private platformClient: PlatformClient;
  constructor(private apikey: string, private organizationid: string) {
    this.platformClient = new PlatformClient({
      accessToken: this.apikey,
      environment: Environment.prod,
      organizationId: this.organizationid,
    });
  }

  create(name: string, sourceVisibility: SourceVisibility) {
    return this.platformClient.source.create({
      sourceType: SourceType.PUSH,
      pushEnabled: true,
      name,
      sourceVisibility,
    });
  }

  createOrUpdateSecurityIdentityAlias() {
    // TODO;
  }

  deleteSecurityIdentity() {
    // TODO;
  }

  deleteOldSecurityIdentities() {
    // TODO;
  }

  manageSecurityIdentities() {
    // TODO;
  }

  addOrUpdateDocument(sourceID: string, doc: Document) {
    return axios.put(
      `https://api.cloud.coveo.com/push/v1/organizations/${
        this.organizationid
      }/sources/${sourceID}/documents?documentId=${encodeURIComponent(
        doc.uri
      )}`,
      JSON.stringify(doc),
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${this.apikey}`,
        },
      }
    );
  }
}
