/* eslint-disable node/no-unpublished-import */
jest.mock('@coveo/platform-client');
jest.mock('./documentUploader');
jest.mock('../uploadStrategy');
jest.mock('axios');
import PlatformClient, {SourceVisibility} from '@coveo/platform-client';
import {PushSource} from './push';
import {DocumentBuilder} from '../documentBuilder';
import {join} from 'path';
import {cwd} from 'process';
import {BatchUpdateDocuments, PlatformEnvironment, Region} from '..';
import axios, {AxiosPromise} from 'axios';
import {
  uploadBatch,
  uploadBatchFromFile,
  uploadDocument,
} from './documentUploader';
import {FileContainerStrategy} from '../uploadStrategy';
import {PushUrlBuilder} from '../help/urlUtils';

const mockedAxios = jest.mocked(axios);
const mockedDelete = jest.fn();
const mockedPost = jest.fn();
const mockedPlatformClient = jest.mocked(PlatformClient);
const mockCreateSource = jest.fn();

const mockedUploadDocument = jest.mocked(uploadDocument);
const mockedUploadBatch = jest.mocked(uploadBatch);
const mockedUploadBatchFromFile = jest.mocked(uploadBatchFromFile);
const pathToStub = join(cwd(), 'src', '__stub__');

const requestHeader = {
  headers: {
    Accept: 'application/json',
    Authorization: 'Bearer the_key',
    'Content-Type': 'application/json',
  },
};
const dummyClient = {
  source: {
    create: mockCreateSource,
  },
} as unknown as PlatformClient;

const doMockPlatformClient = () => {
  mockedPlatformClient.mockImplementation(() => dummyClient);
};

const doMockAxios = () => {
  mockedAxios.delete = mockedDelete;
  mockedAxios.post = mockedPost;
};

describe('PushSource', () => {
  let defaultSource: PushSource;

  beforeAll(() => {
    doMockAxios();
    doMockPlatformClient();
  });

  beforeEach(() => {
    defaultSource = new PushSource('the_key', 'the_org');
  });

  it('should call platform client on creation', () => {
    defaultSource.create('the_name', SourceVisibility.SHARED);

    expect(mockCreateSource).toHaveBeenCalledWith({
      name: 'the_name',
      pushEnabled: true,
      sourceType: 'PUSH',
      sourceVisibility: 'SHARED',
    });
  });

  it.each([
    {
      title: 'default region/environment',
      expectedUrl:
        'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents',
    },
    {
      title: 'non default region',
      options: {
        region: Region.AU,
      },
      expectedUrl:
        'https://api-au.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents',
    },
    {
      title: 'non default environment',
      options: {
        environment: PlatformEnvironment.Dev,
      },
      expectedUrl:
        'https://apidev.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents',
    },
    {
      title: 'non default region/environment',
      options: {
        environment: PlatformEnvironment.Stg,
        region: Region.EU,
      },
      expectedUrl:
        'https://apistg-eu.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents',
    },
  ])(
    'should call #uploadDocument with $title',
    async ({options, expectedUrl}) => {
      await new PushSource('the_key', 'the_org', options).addOrUpdateDocument(
        'the_id',
        new DocumentBuilder('the_uri', 'the_title')
      );

      expect(mockedUploadDocument).toHaveBeenCalledWith(
        dummyClient,
        new DocumentBuilder('the_uri', 'the_title'),
        new URL(expectedUrl),
        requestHeader,
        undefined
      );
    }
  );

  it('should call #uploadDocument with right BatchUpdateDocumentsOptions', async () => {
    await defaultSource.addOrUpdateDocument(
      'the_id',
      new DocumentBuilder('the_uri', 'the_title'),
      {createFields: true}
    );

    expect(mockedUploadDocument).toHaveBeenCalledWith(
      dummyClient,
      new DocumentBuilder('the_uri', 'the_title'),
      new URL(
        'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents'
      ),
      requestHeader,
      {createFields: true}
    );
  });

  it('should do a delete request', () => {
    defaultSource.deleteDocument('the_id', 'the_uri', true);
    expect(mockedDelete).toHaveBeenCalledWith(
      'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents?documentId=the_uri&deleteChildren=true',
      {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer the_key',
          'Content-Type': 'application/json',
        },
      }
    );
  });

  it('should do a post request', () => {
    defaultSource.setSourceStatus('the_id', 'INCREMENTAL');
    expect(mockedPost).toHaveBeenCalledWith(
      'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/status?statusType=INCREMENTAL',
      {},
      {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer the_key',
          'Content-Type': 'application/json',
        },
      }
    );
  });

  describe('when delete olderthan', () => {
    const expectCorrectOrderingId = (id: number | string) => {
      expect(mockedDelete).toHaveBeenCalledWith(
        `https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents/olderthan?orderingId=${id}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer the_key',
            'Content-Type': 'application/json',
          },
        }
      );
    };

    it('with a date', () => {
      const now = new Date();
      defaultSource.deleteDocumentsOlderThan('the_id', now);
      expectCorrectOrderingId(now.valueOf());
    });

    it('with a date string', () => {
      defaultSource.deleteDocumentsOlderThan('the_id', '2001/01/01');
      expectCorrectOrderingId(new Date('2001/01/01').valueOf());
    });

    it('with a timestamp', () => {
      const nowInTimestamp = new Date().valueOf();
      defaultSource.deleteDocumentsOlderThan('the_id', nowInTimestamp);
      expectCorrectOrderingId(nowInTimestamp);
    });
  });

  it('should do a delete requets', () => {
    defaultSource.deleteDocument('the_id', 'the_uri', true);
    expect(mockedDelete).toHaveBeenCalledWith(
      'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents?documentId=the_uri&deleteChildren=true',
      {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer the_key',
          'Content-Type': 'application/json',
        },
      }
    );
  });

  describe('when doing batch update', () => {
    const batch: BatchUpdateDocuments = {
      addOrUpdate: [
        new DocumentBuilder('the_uri_1', 'the_title_1'),
        new DocumentBuilder('the_uri_2', 'the_title_2'),
      ],
      delete: [{documentId: 'the_uri_3', deleteChildren: true}],
    };

    it('should call #uploadBatch', async () => {
      await defaultSource.batchUpdateDocuments('the_id', batch, {
        createFields: false,
      });

      expect(mockedUploadBatch).toHaveBeenCalledWith(
        dummyClient,
        expect.any(FileContainerStrategy),
        batch,
        {createFields: false}
      );
    });

    it('should call #uploadBatch with the right strategy', async () => {
      await defaultSource.batchUpdateDocuments('the_id', batch);

      expect(FileContainerStrategy).toHaveBeenCalledWith(
        expect.any(PushUrlBuilder),
        requestHeader
      );
    });
  });

  describe('when doing batch update from local files', () => {
    it('should call #uploadBatchFromFile', async () => {
      await defaultSource.batchUpdateDocumentsFromFiles(
        'the_id',
        [join(pathToStub, 'mixdocuments')],
        {createFields: false}
      );

      expect(FileContainerStrategy).toHaveBeenCalledWith(
        expect.any(PushUrlBuilder),
        requestHeader
      );

      expect(mockedUploadBatchFromFile).toHaveBeenCalledWith(
        dummyClient,
        expect.any(FileContainerStrategy),
        [join(pathToStub, 'mixdocuments')],
        {createFields: false}
      );
    });
  });
});
