/* eslint-disable node/no-unpublished-import */
jest.mock('@coveord/platform-client');
jest.mock('axios');
jest.mock('../fieldAnalyser/fieldAnalyser');
import PlatformClient, {
  FieldTypes,
  SourceVisibility,
} from '@coveord/platform-client';
import {PushSource} from './push';
import {DocumentBuilder} from '../documentBuilder';
import axios from 'axios';
import {join} from 'path';
import {cwd} from 'process';
import {
  BatchUpdateDocuments,
  FieldAnalyser,
  PlatformEnvironment,
  Region,
} from '..';
import {Inconsistencies} from '../fieldAnalyser/inconsistencies';
import {FieldTypeInconsistencyError} from '../errors/fieldErrors';
const mockAxios = axios as jest.Mocked<typeof axios>;

const mockedFieldAnalyser = jest.mocked(FieldAnalyser);
const mockedPlatformClient = jest.mocked(PlatformClient);
const mockCreateSource = jest.fn();
const mockEvaluate = jest.fn();
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

describe('PushSource', () => {
  let source: PushSource;
  beforeAll(() => {
    doMockPlatformClient();
    doMockFieldAnalyser();
    doMockAxiosPut();
  });

  beforeEach(() => {
    source = new PushSource('the_key', 'the_org');
    mockEvaluate.mockResolvedValue({approved: true});
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
      pushEnabled: true,
      sourceType: 'PUSH',
      sourceVisibility: 'SHARED',
    });
  });

  it('should call axios on add document', async () => {
    await source.addOrUpdateDocument(
      'the_id',
      new DocumentBuilder('the_uri', 'the_title'),
      {createFields: false}
    );

    expect(mockAxios.put).toHaveBeenCalledWith(
      'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents?documentId=the_uri',
      expect.objectContaining({title: 'the_title'}),
      expectedDocumentsHeaders
    );
  });

  it('should call axios on add document with right region', async () => {
    const australianSource = new PushSource('the_key', 'the_org', {
      region: Region.AU,
    });
    await australianSource.addOrUpdateDocument(
      'the_id',
      new DocumentBuilder('the_uri', 'the_title'),
      {createFields: false}
    );

    expect(mockAxios.put).toHaveBeenCalledWith(
      'https://api-au.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents?documentId=the_uri',
      expect.objectContaining({title: 'the_title'}),
      expectedDocumentsHeaders
    );
  });

  it('should call axios on add document with right environment', async () => {
    await new PushSource('the_key', 'the_org', {
      environment: PlatformEnvironment.Dev,
    }).addOrUpdateDocument(
      'the_id',
      new DocumentBuilder('the_uri', 'the_title'),
      {createFields: false}
    );

    expect(mockAxios.put).toHaveBeenCalledWith(
      'https://apidev.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents?documentId=the_uri',
      expect.objectContaining({title: 'the_title'}),
      expectedDocumentsHeaders
    );
  });

  it('should call axios on add document with right region and environment', async () => {
    await new PushSource('the_key', 'the_org', {
      environment: PlatformEnvironment.QA,
      region: Region.EU,
    }).addOrUpdateDocument(
      'the_id',
      new DocumentBuilder('the_uri', 'the_title'),
      {createFields: false}
    );

    expect(mockAxios.put).toHaveBeenCalledWith(
      'https://apiqa-eu.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents?documentId=the_uri',
      expect.objectContaining({title: 'the_title'}),
      expectedDocumentsHeaders
    );
  });

  it('should call axios on delete', () => {
    source.deleteDocument('the_id', 'the_uri', true);
    expect(mockAxios.delete).toHaveBeenCalledWith(
      'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents?documentId=the_uri&deleteChildren=true',
      expectedDocumentsHeaders
    );
  });

  it('should call axios on status update', () => {
    source.setSourceStatus('the_id', 'INCREMENTAL');
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/status?statusType=INCREMENTAL',
      {},
      expectedDocumentsHeaders
    );
  });

  describe('calls axios when doing delete olderthan', () => {
    const expectCorrectOrderingId = (id: number | string) => {
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
        'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents/batch?fileId=file_id',
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
      await source
        .batchUpdateDocumentsFromFiles(
          'the_id',
          [join(pathToStub, 'mixdocuments')],
          {createFields: false}
        )
        .batch();

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

    it('should throw an error if the path is invalid', async () => {
      await expect(() =>
        source
          .batchUpdateDocumentsFromFiles(
            'the_id',
            ['path/to/invalid/document'],
            {createFields: false}
          )
          .batch()
      ).rejects.toThrow(
        "no such file or directory, lstat 'path/to/invalid/document'"
      );
    });

    it('should call the callback without error when uploading documents', async () => {
      await source
        .batchUpdateDocumentsFromFiles(
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
        .batchUpdateDocumentsFromFiles(
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
      mockAxios.post.mockRejectedValue({message: 'Error Message'});

      await source
        .batchUpdateDocumentsFromFiles(
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
  });

  describe('when enabling auto field creation', () => {
    let source: PushSource;
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
      source = new PushSource('the_key', 'the_org');
    });

    describe('when there are no inconsistencies', () => {
      beforeEach(() => {
        const inconsistencies = new Inconsistencies();
        mockAnalyserReport.mockReturnValueOnce({fields: [], inconsistencies});
      });

      it('should analyse document builder', async () => {
        const docBuilder = new DocumentBuilder('the_uri', 'the_title');
        await source.addOrUpdateDocument('the_id', docBuilder);
        expect(mockAnalyserAdd).toHaveBeenCalledWith([docBuilder]);
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
      it('should throw', async () => {
        await expect(() =>
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

    describe('when field names should be transformed', () => {
      beforeEach(() => {
        const inconsistencies = new Inconsistencies();
        mockAnalyserReport.mockReturnValueOnce({
          fields: [{name: 'transformed_field', type: FieldTypes.STRING}],
          inconsistencies,
        });
      });

      describe('when field normalization is enabled', () => {
        it('should create transformed fields', async () => {
          await source.batchUpdateDocuments('the_id', batch);
          expect(mockCreateField).toHaveBeenCalledWith([
            {name: 'transformed_field', type: FieldTypes.STRING},
          ]);
        });
      });
    });
  });
});
