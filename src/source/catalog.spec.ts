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
import {FieldAnalyser} from '..';
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

const doAxiosMockPost = () => {
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

describe('CatalogSource', () => {
  let source: CatalogSource;
  beforeAll(() => {
    doMockPlatformClient();
    doMockFieldAnalyser();
  });

  beforeEach(() => {
    source = new CatalogSource('the_key', 'the_org');
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

    expect(mockCreateSource).toHaveBeenCalledWith({
      name: 'the_name',
      streamEnabled: true,
      sourceType: 'CATALOG',
      sourceVisibility: 'SHARED',
    });
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

      doAxiosMockPost();
    });

    it('should create a file container', async () => {
      await source.batchUpdateDocuments('the_id', batch, {
        createFields: false,
      });
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://api.cloud.coveo.com/push/v1/organizations/the_org/files',
        expect.objectContaining({}),
        expectedDocumentsHeaders
      );
    });

    it('should upload files to container with returned upload uri and required headers ', async () => {
      await source.batchUpdateDocuments('the_id', batch, {
        createFields: false,
      });
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
      await source.batchUpdateDocuments('the_id', batch, {
        createFields: false,
      });
      expect(mockAxios.put).toHaveBeenCalledWith(
        'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/stream/update?fileId=file_id',
        {},
        expectedDocumentsHeaders
      );
    });
  });

  describe('when doing batch update from local files', () => {
    afterAll(() => {
      mockAxios.post.mockReset();
    });

    beforeEach(() => {
      doAxiosMockPost();
    });

    it('should upload documents from local file', async () => {
      const {done} = await source.batchUpdateDocumentsFromFiles(
        'the_id',
        [join(pathToStub, 'mixdocuments')],
        {createFields: false}
      );

      await done();

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

    it('should throw an error if the path is invalid', () => {
      expect(() =>
        source.batchUpdateDocumentsFromFiles(
          'the_id',
          ['path/to/invalid/document'],
          {createFields: false}
        )
      ).rejects.toThrow(
        "no such file or directory, lstat 'path/to/invalid/document'"
      );
    });

    it('should call the callback without error when uploading documents', async () => {
      const {onBatchError, done} = await source.batchUpdateDocumentsFromFiles(
        'the_id',
        [join(pathToStub, 'mixdocuments')],
        {createFields: false}
      );
      onBatchError(mockedErrorCallback);
      await done();
      expect(mockedErrorCallback).not.toHaveBeenCalled();
    });

    it('should only push JSON files', async () => {
      const {onBatchUpload, done} = await source.batchUpdateDocumentsFromFiles(
        'the_id',
        [join(pathToStub, 'mixdocuments')],
        {createFields: false}
      );
      onBatchUpload(mockedSuccessCallback);
      await done();

      expect(mockedSuccessCallback).toHaveBeenCalledWith(
        expect.objectContaining({files: ['valid.json']})
      );
    });

    it('should call the errorCallback on a failure from the API', async () => {
      mockAxios.post.mockReset();
      mockAxios.post.mockRejectedValue({message: 'Error Message'});

      const {onBatchError, done} = await source.batchUpdateDocumentsFromFiles(
        'the_id',
        [join(pathToStub, 'mixdocuments')],
        {createFields: false}
      );

      onBatchError(mockedErrorCallback);
      await done();
      expect(mockedErrorCallback).toHaveBeenCalledWith(
        {
          message: 'Error Message',
        },
        expect.anything()
      );
    });
  });

  describe('when streaming data from batch', () => {
    it.todo('should open a stream');
    it.todo('should close a stream');
    it.todo('should request a stream chunk');
    it.todo('should upload content to stream chunk');
  });

  describe('when streaming data from local files', () => {
    it.todo('should open a stream');
    it.todo('should close a stream');
    it.todo('should request a stream chunk');
    it.todo('should upload content to stream chunk');
    it.todo('should upload documents from local file');
    it.todo('should throw an error if the path is invalid');
    it.todo('should call the callback without error when uploading documents');
    it.todo('should only push JSON files');
    it.todo('should call the errorCallback on a failure from the API');
  });

  describe('when enabling auto field creation', () => {
    let batch: BatchUpdateDocuments;

    beforeAll(() => {
      batch = {
        addOrUpdate: [
          new DocumentBuilder('the_uri_1', 'the_title_1'),
          new DocumentBuilder('the_uri_2', 'the_title_2'),
        ],
        delete: [],
      };
    });

    beforeEach(() => {
      doAxiosMockPost();
    });

    describe('when there are no inconsistencies', () => {
      beforeEach(() => {
        const inconsistencies = new Inconsistencies();
        mockAnalyserReport.mockReturnValueOnce({fields: [], inconsistencies});
      });

      it('should analyse document builder batch', async () => {
        await source.batchUpdateDocuments('the_id', batch);
        expect(mockAnalyserAdd).toHaveBeenCalledWith(batch.addOrUpdate);
      });
    });

    describe('when document batches contain type inconsistencies', () => {
      beforeEach(() => {
        const inconsistencies = new Inconsistencies().add('foo', [
          FieldTypes.STRING,
          FieldTypes.DOUBLE,
        ]);
        mockAnalyserReport.mockReturnValueOnce({fields: [], inconsistencies});
      });
      it('should throw', () => {
        expect(() =>
          source.batchUpdateDocuments('the_id', batch)
        ).rejects.toThrow(FieldTypeInconsistencyError);
      });
    });

    describe('when document batches contain missing fields', () => {
      beforeEach(() => {
        const inconsistencies = new Inconsistencies();
        mockAnalyserReport.mockReturnValueOnce({
          fields: [
            {name: 'stringfield', type: FieldTypes.STRING},
            {name: 'numericalfield', type: FieldTypes.DOUBLE},
          ],
          inconsistencies,
        });
      });
      it('should create fields', async () => {
        await source.batchUpdateDocuments('the_id', batch);
        expect(mockCreateField).toHaveBeenCalledWith([
          {name: 'stringfield', type: FieldTypes.STRING},
          {name: 'numericalfield', type: FieldTypes.DOUBLE},
        ]);
      });
    });

    describe('when document batches do not contain missing fields', () => {
      beforeEach(() => {
        const inconsistencies = new Inconsistencies();
        mockAnalyserReport.mockReturnValueOnce({fields: [], inconsistencies});
      });

      it('should not create fields', async () => {
        source.batchUpdateDocuments('the_id', batch);
        expect(mockCreateField).not.toHaveBeenCalled();
      });
    });
  });
});
