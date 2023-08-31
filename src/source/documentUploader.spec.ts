jest.mock('../fieldAnalyser/fieldAnalyser');
jest.mock('../fieldAnalyser/fieldUtils');
jest.mock('../APICore');
jest.mock('./batchUploadDocumentsFromFile');

import PlatformClient from '@coveo/platform-client';
import {DocumentBuilder} from '..';
import {APICore} from '../APICore';
import {FieldAnalyser} from '../fieldAnalyser/fieldAnalyser';
import {createFieldsFromReport} from '../fieldAnalyser/fieldUtils';
import {noop} from '../help/function';
import {BatchUpdateDocuments, BatchUpdateDocumentsOptions} from '../interfaces';
import {UploadStrategy} from '../uploadStrategy';
import {BatchUploadDocumentsFromFilesReturn} from './batchUploadDocumentsFromFile';
import {BuiltInTransformers} from '../validation/transformers/transformer';
import {
  uploadBatch,
  uploadBatchFromFile,
  uploadDocument,
} from './documentUploader';
import {defaultOptions} from '../environment';

const dummyClient = new PlatformClient({accessToken: 'my_token'});
const platformOptions = defaultOptions;
const dummyAPI = new APICore('my_token', platformOptions);
const dummyStrategy: UploadStrategy = {
  upload: jest.fn(),
  preUpload: jest.fn(),
  postUpload: jest.fn(),
};

describe('documentUploader', () => {
  describe('#uploadDocument', () => {
    const upload = (options?: BatchUpdateDocumentsOptions) =>
      uploadDocument(
        dummyClient,
        new DocumentBuilder('http://some.url', 'Some document'),
        new URL('https://fake.upload.url'),
        dummyAPI,
        options
      );

    it('should get field report from FieldAnalyser', async () => {
      await upload({createFields: true});
      expect(FieldAnalyser.prototype.report).toHaveBeenCalled();
    });

    it('should create missing fields from report', async () => {
      await upload({createFields: true});
      expect(createFieldsFromReport).toHaveBeenCalled();
    });

    it('should not create missing fields', async () => {
      await upload({createFields: false});
      expect(createFieldsFromReport).not.toHaveBeenCalled();
    });

    it('should upload document', async () => {
      await upload();
      expect(APICore.prototype.put).toBeCalledWith(
        'https://fake.upload.url/?documentId=http%3A%2F%2Fsome.url',
        expect.objectContaining({
          documentId: 'http://some.url',
          title: 'Some document',
        }),
        false
      );
    });
  });

  describe('#uploadBatch', () => {
    const batch: BatchUpdateDocuments = {
      addOrUpdate: [new DocumentBuilder('http://some.url', 'Some document')],
      delete: [{documentId: 'foo_bar', deleteChildren: true}],
    };
    const upload = (options?: BatchUpdateDocumentsOptions) =>
      uploadBatch(dummyClient, dummyStrategy, batch, options);

    it('should get field report from FieldAnalyser', async () => {
      await upload({createFields: true});
      expect(FieldAnalyser.prototype.report).toHaveBeenCalled();
    });

    it('should create missing fields from report', async () => {
      await upload({createFields: true});
      expect(createFieldsFromReport).toHaveBeenCalled();
    });

    it('should not create missing fields', async () => {
      await upload({createFields: false});
      expect(createFieldsFromReport).not.toHaveBeenCalled();
    });

    it('should execute the pre-upload strategy logic', async () => {
      await upload();
      expect(dummyStrategy.preUpload).toHaveBeenCalled();
    });

    it('should execute the upload strategy logic', async () => {
      await upload();
      expect(dummyStrategy.upload).toHaveBeenCalledWith({
        addOrUpdate: [
          expect.objectContaining({
            uri: 'http://some.url',
          }),
        ],
        delete: [
          {
            deleteChildren: true,
            documentId: 'foo_bar',
          },
        ],
      });
    });

    it('should execute the post-upload strategy logic', async () => {
      await upload();
      expect(dummyStrategy.postUpload).toHaveBeenCalled();
    });
  });

  describe('#uploadBatchFromFile', () => {
    const dummyCallback = jest.fn();

    it('should call BatchUploadDocumentsFromFilesReturn with default options', () => {
      uploadBatchFromFile(dummyClient, dummyStrategy, [
        'path/to/file',
        'other/path',
      ]);
      expect(BatchUploadDocumentsFromFilesReturn).toHaveBeenCalledWith(
        dummyClient,
        dummyStrategy,
        ['path/to/file', 'other/path'],
        {
          callback: noop,
          createFields: true,
          fieldNameTransformer: BuiltInTransformers.identity,
          maxConcurrent: 10,
        }
      );
    });

    it('should call BatchUploadDocumentsFromFilesReturn with custom options', () => {
      uploadBatchFromFile(
        dummyClient,
        dummyStrategy,
        ['path/to/file', 'other/path'],
        {
          createFields: false,
          maxConcurrent: 3,
          fieldNameTransformer: BuiltInTransformers.toLowerCase,
          callback: dummyCallback,
        }
      );
      expect(BatchUploadDocumentsFromFilesReturn).toHaveBeenCalledWith(
        dummyClient,
        dummyStrategy,
        ['path/to/file', 'other/path'],
        {
          callback: dummyCallback,
          createFields: false,
          fieldNameTransformer: BuiltInTransformers.toLowerCase,
          maxConcurrent: 3,
        }
      );
    });
  });
});
