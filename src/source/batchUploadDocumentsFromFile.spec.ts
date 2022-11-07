jest.mock('../help/file');
jest.mock('../validation/parseFile');
jest.mock('../fieldAnalyser/fieldAnalyser');
jest.mock('../fieldAnalyser/fieldUtils');

import PlatformClient from '@coveord/platform-client';
import {DocumentBuilder} from '..';
import {FieldAnalyser} from '../fieldAnalyser/fieldAnalyser';
import {createFieldsFromReport} from '../fieldAnalyser/fieldUtils';
import {getAllJsonFilesFromEntries} from '../help/file';
import {noop} from '../help/function';
import {
  BatchUpdateDocumentsFromFiles,
  BatchUpdateDocumentsOptions,
} from '../interfaces';
import {UploadStrategy} from '../uploadStrategy';
import {parseAndGetDocumentBuilderFromJSONDocument} from '../validation/parseFile';
import {BuiltInTransformers} from '../validation/transformers/transformer';
import {BatchUploadDocumentsFromFilesReturn} from './batchUploadDocumentsFromFile';

const mockedParse = jest.mocked(parseAndGetDocumentBuilderFromJSONDocument);
const mockedGetAllFilesFromEntries = jest.mocked(getAllJsonFilesFromEntries);
const mockedUpload = jest.fn();
const mockedPreUpload = jest.fn();
const mockedPostUpload = jest.fn();

const mockedStrategy: UploadStrategy = {
  upload: mockedUpload,
  preUpload: mockedPreUpload,
  postUpload: mockedPostUpload,
};

const getDocBuilder = () =>
  new DocumentBuilder('http://uri.com', 'title').withPermanentId('random-id');

const getBatchUpload = (options?: BatchUpdateDocumentsFromFiles) => {
  const defaultBatchOptions: Required<BatchUpdateDocumentsOptions> = {
    createFields: true,
  };
  const defaultBatchFromFileOptions: Required<BatchUpdateDocumentsFromFiles> = {
    ...defaultBatchOptions,
    fieldNameTransformer: BuiltInTransformers.identity,
    maxConcurrent: 10,
    callback: noop,
  };
  const client = new PlatformClient({accessToken: 'xxx'});
  return new BatchUploadDocumentsFromFilesReturn(
    client,
    mockedStrategy,
    ['some/folder'],
    {
      ...defaultBatchFromFileOptions,
      ...options,
    }
  );
};

const doMockSuccessUpload = () => {
  mockedUpload.mockResolvedValue({status: 202, statusText: 'ALL_GOOD'});
};

const doMockFailedUpload = () => {
  mockedUpload.mockRejectedValue({status: 412, statusText: 'BAD_REQUEST'});
};

const doMockSuccessParse = () => {
  mockedParse.mockResolvedValue([getDocBuilder()]);
};

const doMockGetFilesFromEntries = () => {
  mockedGetAllFilesFromEntries.mockReturnValue([
    'path/file_1.json',
    'path/file_2.json',
  ]);
};

describe('BatchUploadDocumentsFromFilesReturn', () => {
  beforeEach(() => {
    doMockSuccessUpload();
  });

  beforeAll(() => {
    doMockGetFilesFromEntries();
    doMockSuccessParse();
  });

  describe('when createFields option is set to true', () => {
    beforeEach(async () => {
      await getBatchUpload({createFields: true}).batch();
    });

    it('should always call the field analyser', () => {
      expect(FieldAnalyser).toHaveBeenCalledTimes(1);
    });

    it('should call #createFieldsFromReport', () => {
      expect(createFieldsFromReport).toHaveBeenCalledTimes(1);
    });
  });

  describe('when createFields option is set to false', () => {
    beforeEach(() => {
      getBatchUpload({createFields: false}).batch();
    });

    it('should always call the field analyser', () => {
      expect(FieldAnalyser).toHaveBeenCalledTimes(1);
    });

    it('should call #createFieldsFromReport', () => {
      expect(createFieldsFromReport).not.toHaveBeenCalled();
    });
  });

  describe('when files are successfully consumed', () => {
    const mockedSuccessCallback = jest.fn();
    const mockedErrorCallback = jest.fn();

    beforeEach(async () => {
      await getBatchUpload()
        .onBatchUpload(mockedSuccessCallback)
        .onBatchError(mockedErrorCallback)
        .batch();
    });

    it('should call the success callback', async () => {
      expect(mockedSuccessCallback).toHaveBeenCalledWith({
        batch: [getDocBuilder(), getDocBuilder()], // 1 doc builder per parsed file
        files: ['file_1.json', 'file_2.json'],
        progress: {
          remainingDocumentCount: 0,
          totalDocumentCount: 2,
        },
        res: {
          status: 202,
          statusText: 'ALL_GOOD',
        },
      });
    });

    it('should call the callback without error when uploading documents', async () => {
      expect(mockedErrorCallback).not.toHaveBeenCalled();
    });
  });

  describe('when API returns an error', () => {
    const mockedSuccessCallback = jest.fn();
    const mockedErrorCallback = jest.fn();

    beforeAll(() => {
      mockedUpload.mockReset();
    });

    beforeEach(async () => {
      doMockFailedUpload();
      await getBatchUpload()
        .onBatchUpload(mockedSuccessCallback)
        .onBatchError(mockedErrorCallback)
        .batch();
    });

    it('should call the errorCallback on a failure from the API', async () => {
      expect(mockedErrorCallback).toHaveBeenCalledWith(
        {status: 412, statusText: 'BAD_REQUEST'},
        {
          batch: [getDocBuilder(), getDocBuilder()], // 1 doc builder per parsed file
          files: ['file_1.json', 'file_2.json'],
          progress: {
            remainingDocumentCount: 0,
            totalDocumentCount: 2,
          },
        }
      );
    });
  });

  it('should call #getAllJsonFilesFromEntries with the right files', async () => {
    await getBatchUpload().batch();
    expect(mockedGetAllFilesFromEntries).toHaveBeenCalledWith(['some/folder']);
  });

  it('should execute pre and post upload methods once', async () => {
    await getBatchUpload().batch();
    expect(mockedPreUpload).toHaveBeenCalledTimes(1);
    expect(mockedPostUpload).toHaveBeenCalledTimes(1);
    expect(mockedUpload).toHaveBeenCalledTimes(1);
  });

  it('should execute upload', async () => {
    await getBatchUpload().batch();
    expect(mockedUpload).toHaveBeenCalled();
  });
});
