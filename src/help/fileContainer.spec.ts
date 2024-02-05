import {BatchUpdateDocuments, DocumentBuilder} from '..';
import {
  FileContainerResponse,
  uploadContentToFileContainer,
} from './fileContainer';

describe('#uploadContentToFileContainer', () => {
  let mockedFetch: jest.SpyInstance;
  const fileContainerResponse: FileContainerResponse = {
    uploadUri: 'https://fake.upload.url',
    fileId: 'file_id',
    requiredHeaders: {foo: 'bar'},
  };

  const batch: BatchUpdateDocuments = {
    addOrUpdate: [new DocumentBuilder('http://some.url', 'Some document')],
    delete: [],
  };

  const doMockFetch = () => {
    mockedFetch = jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve({ok:true, status:200} as Response));
  };

  beforeEach(() => {
    doMockFetch();
  });

  it('should perform an PUT request with the right params', async () => {
    await uploadContentToFileContainer(fileContainerResponse, batch);

    expect(mockedFetch).toHaveBeenCalled();
    expect(mockedFetch.mock.lastCall).toMatchSnapshot();
  });

  describe('when the server respond with 413', () => {
    beforeEach(() => {
      mockedFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 413,
        })
      );
    });

    it('should give some info on how to fix it', async () => {
      try {
        await uploadContentToFileContainer(fileContainerResponse, batch);
      } catch (error) {
        expect(error).toBeInstanceOf(AggregateError);
        expect((error as AggregateError).errors).toMatchSnapshot(`
          [
            [Error: File container size limit exceeded.
          See <https://docs.coveo.com/en/63/index-content/push-api-limits#request-size-limits>.],
          ]
        `);
      }
      expect.assertions(2);
    });
  });

  describe('when anything else than MaxBodyLengthExceededError is thrown', () => {
    const thrownError = new Error();
    beforeEach(() => {
      mockedFetch.mockImplementationOnce(() => Promise.reject(thrownError));
    });

    it('should bubble up the error', async () => {
      try {
        await uploadContentToFileContainer(fileContainerResponse, batch);
      } catch (error) {
        expect(error).toBeInstanceOf(AggregateError);
        expect((error as AggregateError).errors).toContain(thrownError);
      }
      expect.assertions(2);
    });
  });
});
