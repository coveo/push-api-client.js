jest.mock('../APICore');
jest.mock('../help/fileContainer');

import {DocumentBuilder} from '..';
import {APICore} from '../APICore';
import {defaultOptions} from '../environment';
import {uploadContentToFileContainer} from '../help/fileContainer';
import {StreamUrlBuilder} from '../help/urlUtils';
import {BatchUpdateDocuments} from '../interfaces';
import {FileContainerResponse} from './fileContainerStrategy';
import {StreamChunkStrategy} from './streamChunkStrategy';

const mockedAPICore = jest.mocked(APICore);
const mockedPost = jest.fn();

const platformOptions = defaultOptions;

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

const doMockAPICore = () => {
  mockedAPICore.prototype.post.mockImplementation(mockedPost);
};

const doFetchMockFileContainerResponse = () => fileContainerResponse;

const doFetchMockOpenStream = () => ({
  streamId: 'the_stream_id',
});

const mockSuccessFetchCalls = () => {
  mockedPost.mockImplementation((url: string) => {
    if (url.match(/chunk/)) {
      return doFetchMockFileContainerResponse();
    }
    if (url.match(/stream\/open/)) {
      return doFetchMockOpenStream();
    }
    return {};
  });
};

describe('StreamChunkStrategy', () => {
  let strategy: StreamChunkStrategy;
  beforeAll(() => {
    doMockAPICore();
    mockSuccessFetchCalls();
  });

  beforeEach(async () => {
    const builder = new StreamUrlBuilder(
      'source-id',
      'org-id',
      platformOptions
    );
    strategy = new StreamChunkStrategy(
      builder,
      new APICore('access_token', platformOptions)
    );
    await strategy.preUpload();
    await strategy.upload(documentBatch);
    await strategy.postUpload();
  });

  it('should make 3 post calls', () => {
    expect(mockedPost).toBeCalledTimes(3);
  });

  it('should open a stream', () => {
    expect(mockedPost).toHaveBeenNthCalledWith(
      1,
      'https://api.cloud.coveo.com/push/v1/organizations/org-id/sources/source-id/stream/open'
    );
  });

  it('should request a stream chunk', () => {
    expect(mockedPost).toHaveBeenNthCalledWith(
      2,
      'https://api.cloud.coveo.com/push/v1/organizations/org-id/sources/source-id/stream/the_stream_id/chunk'
    );
  });

  it('should close the opened stream', () => {
    expect(mockedPost).toHaveBeenNthCalledWith(
      3,
      'https://api.cloud.coveo.com/push/v1/organizations/org-id/sources/source-id/stream/the_stream_id/close'
    );
  });

  it('should call #uploadContentToFileContainer with file container and batch', () => {
    expect(uploadContentToFileContainer).toHaveBeenCalledTimes(1);
    expect(uploadContentToFileContainer).toHaveBeenCalledWith(
      fileContainerResponse,
      documentBatch
    );
  });
});
