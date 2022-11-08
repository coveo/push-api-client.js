const mockedPut = jest.fn();
jest.mock('axios', () => ({
  default: {put: mockedPut},
}));

import {BatchUpdateDocuments, DocumentBuilder} from '..';
import {
  FileContainerResponse,
  uploadContentToFileContainer,
} from './fileContainer';

describe('#uploadContentToFileContainer', () => {
  const fileContainerResponse: FileContainerResponse = {
    uploadUri: 'https://fake.upload.url',
    fileId: 'file_id',
    requiredHeaders: {foo: 'bar'},
  };

  const batch: BatchUpdateDocuments = {
    addOrUpdate: [new DocumentBuilder('http://some.url', 'Some document')],
    delete: [],
  };

  const doMockAxiosPut = () => {
    mockedPut.mockImplementation(() => Promise.resolve());
  };

  beforeEach(() => {
    doMockAxiosPut();
  });

  it('should perform an PUT request with the right params', async () => {
    await uploadContentToFileContainer(fileContainerResponse, batch);

    expect(mockedPut).toHaveBeenCalledWith(
      'https://fake.upload.url/',
      expect.objectContaining({
        addOrUpdate: expect.arrayContaining([
          expect.objectContaining({
            documentId: 'http://some.url',
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

  describe('when an MaxBodyLengthExceededError is thrown', () => {
    beforeEach(() => {
      mockedPut.mockImplementationOnce(() =>
        Promise.reject(new FakeMaxBodyLengthExceededError())
      );
    });

    it('should give some info on how to fix it', async () => {
      await expect(
        uploadContentToFileContainer(fileContainerResponse, batch)
      ).rejects.toThrowErrorMatchingSnapshot();
    });
  });

  describe('when anything else than MaxBodyLengthExceededError is thrown', () => {
    const thrownError = new Error();
    beforeEach(() => {
      mockedPut.mockImplementationOnce(() => Promise.reject(thrownError));
    });

    it('should just bubble up the error', async () => {
      await expect(
        uploadContentToFileContainer(fileContainerResponse, batch)
      ).rejects.toBe(thrownError);
    });
  });
});

class FakeMaxBodyLengthExceededError extends Error {
  code = 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED';
  message = 'some initial message';
}
