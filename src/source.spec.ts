/* eslint-disable node/no-unpublished-import */
jest.mock('@coveord/platform-client');
jest.mock('axios');
import PlatformClient, {SourceVisibility} from '@coveord/platform-client';
import {BatchUpdateDocuments, Source} from './source';
import {mocked} from 'ts-jest/utils';
import {DocumentBuilder} from './documentBuilder';
import axios from 'axios';
const mockAxios = axios as jest.Mocked<typeof axios>;

const mockedPlatformClient = mocked(PlatformClient);
const mockCreate = jest.fn();
mockedPlatformClient.mockImplementation(
  () =>
    (({
      source: {
        create: mockCreate,
      },
    } as unknown) as PlatformClient)
);

describe('Source', () => {
  let source: Source;
  beforeEach(() => {
    source = new Source('the_key', 'the_org');
  });

  const expectedDocumentsHeaders = {
    headers: {
      Accept: 'application/json',
      Authorization: 'Bearer the_key',
      'Content-Type': 'application/json',
    },
  };

  it('should call platform client on creation', () => {
    source.create('the_name', SourceVisibility.SHARED);

    expect(mockCreate).toHaveBeenCalledWith({
      name: 'the_name',
      pushEnabled: true,
      sourceType: 'PUSH',
      sourceVisibility: 'SHARED',
    });
  });

  it('should call axios on add document', () => {
    source.addOrUpdateDocument(
      'the_id',
      new DocumentBuilder('the_uri', 'the_title')
    );

    expect(mockAxios.put).toHaveBeenCalledWith(
      'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents?documentId=the_uri',
      expect.objectContaining({title: 'the_title'}),
      expectedDocumentsHeaders
    );
  });

  describe('calls axios when doing delete olderthan', () => {
    const expectCorrectOrderingId = (id: any) => {
      expect(mockAxios.delete).toHaveBeenCalledWith(
        `https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents/olderthan?orderingId=${id}`,
        expectedDocumentsHeaders
      );
    };

    it('with a date', () => {
      const now = new Date();
      source.deleteDocumentsOlderThan('the_id', now);
      expectCorrectOrderingId(now.valueOf());
    });

    it('with a date string', () => {
      source.deleteDocumentsOlderThan('the_id', '2001/01/01');
      expectCorrectOrderingId(new Date('2001/01/01').valueOf());
    });

    it('with a timestamp', () => {
      const nowInTimestamp = new Date().valueOf();
      source.deleteDocumentsOlderThan('the_id', nowInTimestamp);
      expectCorrectOrderingId(nowInTimestamp);
    });
  });

  it('should call axios on delete', () => {
    source.deleteDocument('the_id', 'the_uri', true);
    expect(mockAxios.delete).toHaveBeenCalledWith(
      'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents?documentId=the_uri&deleteChildren=true',
      expectedDocumentsHeaders
    );
  });

  describe('when doing batch update', () => {
    let batch: BatchUpdateDocuments;
    beforeEach(() => {
      batch = {
        addOrUpdate: [
          new DocumentBuilder('the_uri_1', 'the_title_1'),
          new DocumentBuilder('the_uri_2', 'the_title_2'),
        ],
        delete: [{documentId: 'the_uri_3', deleteChildren: true}],
      };

      mockAxios.post.mockImplementationOnce((url: string) => {
        if (url.match(/files/)) {
          return Promise.resolve({
            data: {
              uploadUri: 'https://fake.upload.url',
              fileId: 'file_id',
              requiredHeaders: {foo: 'bar'},
            },
          });
        }
        return Promise.resolve();
      });
    });

    it('should create a file container', async () => {
      await source.batchUpdateDocuments('the_id', batch);
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://api.cloud.coveo.com/push/v1/organizations/the_org/files',
        expect.objectContaining({}),
        expectedDocumentsHeaders
      );
    });

    it('should upload files to container with returned upload uri and required headers ', async () => {
      await source.batchUpdateDocuments('the_id', batch);
      expect(mockAxios.put).toHaveBeenCalledWith(
        'https://fake.upload.url/',
        expect.objectContaining({
          addOrUpdate: expect.arrayContaining([
            expect.objectContaining({documentId: 'the_uri_1'}),
            expect.objectContaining({documentId: 'the_uri_2'}),
          ]),
          delete: expect.arrayContaining([
            expect.objectContaining({documentId: 'the_uri_3'}),
          ]),
        }),
        {headers: {foo: 'bar'}}
      );
    });

    it('should push content to source with returned fileId', async () => {
      await source.batchUpdateDocuments('the_id', batch);
      expect(mockAxios.put).toHaveBeenCalledWith(
        'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents/batch?fileId=file_id',
        {},
        expectedDocumentsHeaders
      );
    });
  });
});
