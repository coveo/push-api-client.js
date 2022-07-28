/* eslint-disable node/no-unpublished-import */
jest.mock('@coveord/platform-client');
jest.mock('axios');
jest.mock('../fieldAnalyser/fieldAnalyser');
import PlatformClient from '@coveord/platform-client';
import axios from 'axios';
import {join} from 'path';
import {cwd} from 'process';
import {CatalogSource} from './catalog';
import {DocumentBuilder, FieldAnalyser} from '..';
import {generateBatmans} from '../__stub__/largeDocuments/documentGenerator';
import {rmSync, writeFileSync, mkdirSync} from 'fs';
const mockAxios = axios as jest.Mocked<typeof axios>;

const mockedFieldAnalyser = jest.mocked(FieldAnalyser);
const mockedPlatformClient = jest.mocked(PlatformClient);
const mockCreateSource = jest.fn();
const mockCreateField = jest.fn();
const mockEvaluate = jest.fn();
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

const doMockAxiosPut = () => {
  mockAxios.put.mockImplementation(() => Promise.resolve());
};

const doMockPlatformClient = () => {
  mockedPlatformClient.mockImplementation(
    () =>
      ({
        privilegeEvaluator: {evaluate: mockEvaluate},
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

const mockSuccessAxiosCalls = () => {
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

const mockFailedChunkAxiosCalls = (err: string) => {
  mockAxios.post.mockImplementation((url: string) => {
    if (url.match(/chunk/)) {
      return Promise.reject({message: err});
    }
    if (url.match(/stream\/open/)) {
      return Promise.resolve(doAxiosMockOpenStream());
    }
    return Promise.resolve({data: {}});
  });
};

const basicStreamExpectations = () => {
  it('should open a stream', async () => {
    expect(mockAxios.post).toHaveBeenNthCalledWith(
      1,
      'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/stream/open',
      {},
      expectedDocumentsHeaders
    );
  });

  it('should request a stream chunk', async () => {
    expect(mockAxios.post).toHaveBeenNthCalledWith(
      2,
      'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/stream/the_stream_id/chunk',
      {},
      expectedDocumentsHeaders
    );
  });

  it('should close a stream', async () => {
    expect(mockAxios.post).toHaveBeenLastCalledWith(
      'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/stream/the_stream_id/close',
      {},
      expectedDocumentsHeaders
    );
  });
};

describe('CatalogSource - Stream', () => {
  let source: CatalogSource;
  beforeAll(() => {
    doMockPlatformClient();
    doMockFieldAnalyser();
    doMockAxiosPut();
  });

  beforeEach(() => {
    mockEvaluate.mockResolvedValue({approved: true});
    source = new CatalogSource('the_key', 'the_org');
  });

  describe('when streaming data from a batch', () => {
    beforeEach(async () => {
      mockSuccessAxiosCalls();
      await source.batchStreamDocuments(
        'the_id',
        {
          addOrUpdate: [new DocumentBuilder('uri', 'title')],
          delete: [],
        },
        {createFields: false}
      );
    });

    afterAll(() => {
      mockAxios.post.mockReset();
    });

    basicStreamExpectations();
  });

  describe('when streaming data from a file', () => {
    beforeEach(async () => {
      mockSuccessAxiosCalls();
      await source
        .batchStreamDocumentsFromFiles(
          'the_id',
          [join(pathToStub, 'mixdocuments')],
          {createFields: false}
        )
        .batch();
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
          maxBodyLength: 256e6,
        }
      );
    });
  });

  describe('when streaming large amount of data', () => {
    beforeAll(() => {
      mkdirSync(join(pathToStub, 'batman_temp_dir'));
      writeFileSync(
        join(pathToStub, 'batman_temp_dir', 'mucho_batmans.json'),
        JSON.stringify(generateBatmans(10e3), null, 2) // Enough batmans so they can be sent in multiple chunks
      );
    });

    beforeEach(async () => {
      mockSuccessAxiosCalls();
      await source
        .batchStreamDocumentsFromFiles(
          'the_id',
          [join(pathToStub, 'batman_temp_dir', 'mucho_batmans.json')],
          {createFields: false}
        )
        .batch();
    });

    afterAll(() => {
      rmSync(join(pathToStub, 'batman_temp_dir'), {
        recursive: true,
      });
      mockAxios.post.mockReset();
    });

    basicStreamExpectations();
  });

  describe('when streaming data from local files', () => {
    beforeEach(async () => {
      mockSuccessAxiosCalls();
    });

    afterAll(() => {
      mockAxios.post.mockReset();
    });

    describe('API call expectations', () => {
      beforeEach(async () => {
        mockSuccessAxiosCalls();
        await source
          .batchStreamDocumentsFromFiles(
            'the_id',
            [join(pathToStub, 'mixdocuments')],
            {createFields: false}
          )
          .batch();
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
            maxBodyLength: 256e6,
          }
        );
      });
    });

    it('should call the callback without error when uploading documents', async () => {
      await source
        .batchStreamDocumentsFromFiles(
          'the_id',
          [join(pathToStub, 'mixdocuments')],
          {createFields: false}
        )
        .onBatchError(mockedErrorCallback)
        .batch();
      expect(mockedErrorCallback).not.toHaveBeenCalled();
    });

    it('should only push JSON files', async () => {
      await source
        .batchStreamDocumentsFromFiles(
          'the_id',
          [join(pathToStub, 'mixdocuments')],
          {createFields: false}
        )
        .onBatchUpload(mockedSuccessCallback)
        .batch();

      expect(mockedSuccessCallback).toHaveBeenCalledWith(
        expect.objectContaining({files: ['valid.json']})
      );
    });

    it('should call the errorCallback on a failure from the API', async () => {
      mockAxios.post.mockReset();
      mockFailedChunkAxiosCalls('Error Message');

      await source
        .batchStreamDocumentsFromFiles(
          'the_id',
          [join(pathToStub, 'mixdocuments')],
          {createFields: false}
        )
        .onBatchError(mockedErrorCallback)
        .batch();
      expect(mockedErrorCallback).toHaveBeenCalledWith(
        {
          message: 'Error Message',
        },
        expect.anything()
      );
    });

    it('should throw an error if the path is invalid', () => {
      expect(() =>
        source
          .batchStreamDocumentsFromFiles(
            'the_id',
            ['path/to/invalid/document'],
            {createFields: false}
          )
          .batch()
      ).rejects.toThrow(
        "no such file or directory, lstat 'path/to/invalid/document'"
      );
    });
  });
});
