jest.mock('@coveo/platform-client');
jest.mock('./documentUploader');

import PlatformClient, {SourceVisibility} from '@coveo/platform-client';
import {DocumentBuilder} from '../documentBuilder';
import {join} from 'path';
import {cwd} from 'process';
import {BatchUpdateDocuments} from '../interfaces';
import {CatalogSource} from './catalog';
import {uploadBatch, uploadBatchFromFile} from './documentUploader';
import {FileContainerStrategy, StreamChunkStrategy} from '../uploadStrategy';

const mockedUploadBatch = jest.mocked(uploadBatch);
const mockedUploadBatchFromFile = jest.mocked(uploadBatchFromFile);
const mockedPlatformClient = jest.mocked(PlatformClient);
const mockCreateSource = jest.fn();
const pathToStub = join(cwd(), 'src', '__stub__');

const dummyClient = {
  source: {
    create: mockCreateSource,
  },
} as unknown as PlatformClient;

const doMockPlatformClient = () => {
  mockedPlatformClient.mockImplementation(() => dummyClient);
};

describe('CatalogSource', () => {
  let source: CatalogSource;
  let batch: BatchUpdateDocuments;

  beforeAll(() => {
    doMockPlatformClient();
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

  it('should call platform client on creation', () => {
    source.create('the_name', SourceVisibility.SHARED);

    expect(mockCreateSource).toHaveBeenCalledWith({
      name: 'the_name',
      streamEnabled: true,
      sourceType: 'CATALOG',
      sourceVisibility: 'SHARED',
    });
  });

  it('should upload a batch', async () => {
    await source.batchUpdateDocuments('the_id', batch, {
      createFields: false,
    });
    expect(mockedUploadBatch).toHaveBeenCalledWith(
      dummyClient,
      expect.any(FileContainerStrategy),
      batch,
      {createFields: false}
    );
  });

  it('should upload documents from local file', async () => {
    await source.batchUpdateDocumentsFromFiles(
      'the_id',
      [join(pathToStub, 'mixdocuments')],
      {createFields: false}
    );

    expect(mockedUploadBatchFromFile).toHaveBeenCalledWith(
      dummyClient,
      expect.any(FileContainerStrategy),
      [join(pathToStub, 'mixdocuments')],
      {createFields: false}
    );
  });

  it('should stream documents from local file', async () => {
    await source.batchStreamDocumentsFromFiles(
      'the_id',
      [join(pathToStub, 'mixdocuments')],
      {createFields: false}
    );

    expect(mockedUploadBatchFromFile).toHaveBeenCalledWith(
      dummyClient,
      expect.any(StreamChunkStrategy),
      [join(pathToStub, 'mixdocuments')],
      {createFields: false}
    );
  });
});
