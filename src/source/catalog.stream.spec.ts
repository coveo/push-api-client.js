/* eslint-disable node/no-unpublished-import */
jest.mock('@coveord/platform-client');
jest.mock('axios');
jest.mock('../fieldAnalyser/fieldAnalyser');
import PlatformClient from '@coveord/platform-client';
import axios from 'axios';
import {join} from 'path';
import {cwd} from 'process';
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
  let onBatchError: (callback: FailedUploadCallback) => void;
  let onBatchUpload: (callback: SuccessfulUploadCallback) => void;
  let done: () => Promise<void>;
  beforeAll(() => {
    doMockPlatformClient();
    doMockFieldAnalyser();
  });

  beforeEach(() => {
    source = new CatalogSource('the_key', 'the_org');
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

    // TODO: unskip
    it.skip('should only push JSON files', async () => {
      onBatchUpload(mockedSuccessCallback);
      await done();

      expect(mockedSuccessCallback).toHaveBeenCalledWith(
        expect.objectContaining({files: ['valid.json']})
      );
    });

    it.skip('should call the errorCallback on a failure from the API', async () => {
      mockAxios.post.mockReset();
      mockAxios.post.mockRejectedValue({message: 'Error Message'});

      onBatchError(mockedErrorCallback);
      await done();
      expect(mockedErrorCallback).toHaveBeenCalledWith(
        {
          message: 'Error Message',
        },
        expect.anything()
      );
    });

    it('should throw an error if the path is invalid', () => {
      expect(() =>
        source.batchStreamDocumentsFromFiles(
          'the_id',
          ['path/to/invalid/document'],
          {createFields: false}
        )
      ).rejects.toThrow(
        "no such file or directory, lstat 'path/to/invalid/document'"
      );
    });
  });
});
