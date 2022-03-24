/* eslint-disable node/no-unpublished-import */
jest.mock('@coveord/platform-client');
jest.mock('axios');
jest.mock('../fieldAnalyser/fieldAnalyser');
import PlatformClient, {
  SourceVisibility,
  FieldTypes,
} from '@coveord/platform-client';
import {DocumentBuilder} from '../documentBuilder';
import axios from 'axios';
import {join} from 'path';
import {cwd} from 'process';
import {Inconsistencies} from '../fieldAnalyser/inconsistencies';
import {FieldTypeInconsistencyError} from '../errors/fieldErrors';
import {BatchUpdateDocuments} from '../interfaces';
import {CatalogSource} from './catalog';
import {FieldAnalyser, SuccessfulUploadCallback} from '..';
import {FailedUploadCallback} from '../help/fileConsumer';
const mockAxios = axios as jest.Mocked<typeof axios>;

const mockedFieldAnalyser = jest.mocked(FieldAnalyser);
const mockedPlatformClient = jest.mocked(PlatformClient);
const mockCreateSource = jest.fn();
const mockCreateField = jest.fn();
const mockAnalyserAdd = jest.fn();
const mockAnalyserReport = jest.fn();
const mockedSuccessCallback = jest.fn();
const mockedErrorCallback = jest.fn();
const pathToStub = join(cwd(), 'src', '__stub__');

const expectedDocumentsHeaders = {
  headers: {
    Accept: 'application/json',
    Authorization: 'Bearer the_key',
    'Content-Type': 'application/json',
  },
};

const doAxiosMockFileContainerResponse = () => ({
  data: {
    uploadUri: 'https://fake.upload.url',
    fileId: 'file_id',
    requiredHeaders: {foo: 'bar'},
  },
});

const doAxiosMockOpenStream = () => ({
  data: {
    streamId: 'the_stream_id',
  },
});

const doAxiosMockPost = () => {
  mockAxios.post.mockImplementationOnce((url: string) => {
    if (url.match(/files/)) {
      return Promise.resolve(doAxiosMockFileContainerResponse());
    }
    return Promise.resolve();
  });
};

const doMockPlatformClient = () => {
  mockedPlatformClient.mockImplementation(
    () =>
      ({
        source: {
          create: mockCreateSource,
        },
        field: {
          createFields: mockCreateField,
        },
      } as unknown as PlatformClient)
  );
};
const doMockFieldAnalyser = () => {
  mockedFieldAnalyser.mockImplementation(
    () =>
      ({
        add: mockAnalyserAdd,
        report: mockAnalyserReport,
      } as unknown as FieldAnalyser)
  );
};

const mockAxiosForStreamCalls = () => {
  mockAxios.post.mockImplementation((url: string) => {
    if (url.match(/chunk/)) {
      return Promise.resolve(doAxiosMockFileContainerResponse());
    }
    if (url.match(/stream\/open/)) {
      return Promise.resolve(doAxiosMockOpenStream());
    }
    return Promise.resolve({data: {}});
  });
};

const basicStreamExpectations = () => {
  it('should open a stream', async () => {
    expect(mockAxios.post).toHaveBeenCalledWith(
      'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/stream/open',
      {},
      expectedDocumentsHeaders
    );
  });

  it('should close a stream', async () => {
    expect(mockAxios.post).toHaveBeenCalledWith(
      'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/stream/the_stream_id/close',
      {},
      expectedDocumentsHeaders
    );
  });

  it('should request a stream chunk', async () => {
    expect(mockAxios.post).toHaveBeenCalledWith(
      'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/stream/the_stream_id/chunk',
      {},
      expectedDocumentsHeaders
    );
  });
};

describe('CatalogSource - Stream', () => {
  let source: CatalogSource;
  let batch: BatchUpdateDocuments;
  let onBatchError: (callback: FailedUploadCallback) => void;
  let onBatchUpload: (callback: SuccessfulUploadCallback) => void;
  let done: () => Promise<void>;
  beforeAll(() => {
    doMockPlatformClient();
    doMockFieldAnalyser();
  });

  beforeEach(() => {
    source = new CatalogSource('the_key', 'the_org');
    batch = {
      addOrUpdate: [
        new DocumentBuilder('the_uri_1', 'the_title_1'),
        new DocumentBuilder('the_uri_2', 'the_title_2'),
      ],
      delete: [{documentId: 'the_uri_3', deleteChildren: true}],
    };
  });

  describe('when streaming data from a batch', () => {
    beforeEach(async () => {
      mockAxiosForStreamCalls();
      const res = await source.batchStreamDocumentsFromFiles(
        'the_id',
        [join(pathToStub, 'mixdocuments')],
        {createFields: false}
      );

      onBatchError = res.onBatchError;
      onBatchUpload = res.onBatchUpload;
      done = res.done;
    });

    afterAll(() => {
      mockAxios.post.mockReset();
    });

    basicStreamExpectations();

    it('should upload content to stream chunk', async () => {
      expect(mockAxios.put).toHaveBeenCalledWith(
        'https://fake.upload.url/',
        expect.objectContaining({
          addOrUpdate: expect.arrayContaining([
            expect.objectContaining({
              documentId: 'https://www.themoviedb.org/movie/268',
            }),
            expect.objectContaining({
              documentId: 'https://www.themoviedb.org/movie/999',
            }),
          ]),
          delete: expect.arrayContaining([]),
        }),
        {
          headers: {
            foo: 'bar',
          },
        }
      );
    });
  });

  describe('when streaming data from local files', () => {
    beforeEach(async () => {
      mockAxiosForStreamCalls();
      await source.batchStreamDocumentsFromFiles(
        'the_id',
        [join(pathToStub, 'mixdocuments')],
        {createFields: false}
      );
    });

    afterAll(() => {
      mockAxios.post.mockReset();
    });

    basicStreamExpectations();

    it('should upload documents from local file', async () => {
      expect(mockAxios.put).toHaveBeenCalledWith(
        'https://fake.upload.url/',
        expect.objectContaining({
          addOrUpdate: expect.arrayContaining([
            expect.objectContaining({
              documentId: 'https://www.themoviedb.org/movie/268',
            }),
            expect.objectContaining({
              documentId: 'https://www.themoviedb.org/movie/999',
            }),
          ]),
          delete: expect.arrayContaining([]),
        }),
        {
          headers: {
            foo: 'bar',
          },
        }
      );
    });

    it('should call the callback without error when uploading documents', async () => {
      onBatchError(mockedErrorCallback);
      await done();
      expect(mockedErrorCallback).not.toHaveBeenCalled();
    });

    // TODO:
    // it('should only push JSON files', async () => {
    //   onBatchUpload(mockedSuccessCallback);
    //   await done();

    //   expect(mockedSuccessCallback).toHaveBeenCalledWith(
    //     expect.objectContaining({files: ['valid.json']})
    //   );
    // });

    // it('should call the errorCallback on a failure from the API', async () => {
    //   mockAxios.post.mockReset();
    //   mockAxios.post.mockRejectedValue({message: 'Error Message'});

    //   onBatchError(mockedErrorCallback);
    //   await done();
    //   expect(mockedErrorCallback).toHaveBeenCalledWith(
    //     {
    //       message: 'Error Message',
    //     },
    //     expect.anything()
    //   );
    // });

    // it('should throw an error if the path is invalid', () => {
    //   expect(() =>
    //     source.batchStreamDocumentsFromFiles(
    //       'the_id',
    //       ['path/to/invalid/document'],
    //       {createFields: false}
    //     )
    //   ).rejects.toThrow(
    //     "no such file or directory, lstat 'path/to/invalid/document'"
    //   );
    // });
  });
});
