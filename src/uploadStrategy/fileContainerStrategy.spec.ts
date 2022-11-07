jest.mock('axios');
jest.mock('../help/fileContainer');

import {Region} from '@coveo/platform-client';
import axios from 'axios';
import {DocumentBuilder} from '..';
import {PlatformEnvironment} from '../environment';
import {uploadContentToFileContainer} from '../help/fileContainer';
import {PushUrlBuilder, StreamUrlBuilder} from '../help/urlUtils';
import {BatchUpdateDocuments} from '../interfaces';
import {
  FileContainerResponse,
  FileContainerStrategy,
} from './fileContainerStrategy';

const mockedAxios = jest.mocked(axios);
const mockedPut = jest.fn();
const mockedPost = jest.fn();

const platformOptions = {
  region: Region.US,
  environment: PlatformEnvironment.Prod,
};

const documentBatch: BatchUpdateDocuments = {
  addOrUpdate: [
    new DocumentBuilder('https://foo.com', 'Foo'),
    new DocumentBuilder('https://bar.com', 'Bar'),
  ],
  delete: [{documentId: 'some_id', deleteChildren: false}],
};

const fileContainerResponse: FileContainerResponse = {
  uploadUri: 'https://fake.upload.url',
  fileId: 'file_id',
  requiredHeaders: {foo: 'bar'},
};

const doMockAxios = () => {
  mockedAxios.put = mockedPut;
  mockedAxios.post = mockedPost;
};

const doMockFileContainerResponse = () => {
  mockedPost.mockResolvedValue({data: fileContainerResponse});
};

describe('FileContainerStrategy', () => {
  beforeAll(() => {
    doMockAxios();
  });

  describe.each([
    {
      builderClass: PushUrlBuilder,
      pushUrl:
        'https://api.cloud.coveo.com/push/v1/organizations/org-id/sources/source-id/documents/batch?fileId=file_id', // note the last part of the url
    },
    {
      builderClass: StreamUrlBuilder,
      pushUrl:
        'https://api.cloud.coveo.com/push/v1/organizations/org-id/sources/source-id/stream/update?fileId=file_id', // note the last part of the url
    },
  ])('when using a $builder', ({builderClass, pushUrl}) => {
    let strategy: FileContainerStrategy;

    beforeAll(() => {
      doMockFileContainerResponse();
    });

    beforeEach(async () => {
      const builder = new builderClass('source-id', 'org-id', platformOptions);
      strategy = new FileContainerStrategy(builder, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer the_key',
          'Content-Type': 'application/json',
        },
      });
      await strategy.upload(documentBatch);
    });

    it('should create a file container', () => {
      expect(mockedPost).toHaveBeenCalledTimes(1);
      expect(mockedPost).toHaveBeenCalledWith(
        'https://api.cloud.coveo.com/push/v1/organizations/org-id/files',
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

    it('should call #uploadContentToFileContainer with file container and batch', () => {
      expect(uploadContentToFileContainer).toHaveBeenCalledTimes(1);
      expect(uploadContentToFileContainer).toHaveBeenCalledWith(
        fileContainerResponse,
        {
          addOrUpdate: expect.arrayContaining([
            expect.objectContaining({
              uri: 'https://foo.com',
            }),
            expect.objectContaining({
              uri: 'https://bar.com',
            }),
          ]),
          delete: [{deleteChildren: false, documentId: 'some_id'}],
        }
      );
    });

    it('should push file container content', () => {
      expect(mockedPut).toHaveBeenCalledTimes(1);
      expect(mockedPut).toHaveBeenCalledWith(
        pushUrl,
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
  });
});
