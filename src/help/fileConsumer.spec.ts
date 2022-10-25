jest.mock('axios');

import {fileSync} from 'tmp';
import {join} from 'path';
import {writeFileSync} from 'fs';
import {cwd} from 'process';
import {
  FailedUploadCallback,
  SuccessfulUploadCallback,
  UploadBatchCallbackData,
} from '..';
import {FileConsumer} from './fileConsumer';

/**
 * Create a JSON file containing a document batch
 *
 * @param {number} count the number of items to add to the file (1 is the minimum)
 * @param {number} size the body size (in byte) of each item
 */

function createBatch(count: number, size: number) {
  const tmpDoc = fileSync({postfix: '.json'});
  const template = (byte: number) => {
    const randomCharacter = '#';
    const data = Buffer.alloc(byte * 1024 * 1024, randomCharacter).toString();
    return {
      documentid: 'https://some.url.com',
      title: 'Some Title',
      data,
    };
  };

  const content: string[] = Array(count).fill(template(size));
  writeFileSync(tmpDoc.name, JSON.stringify(content));
  return tmpDoc;
}

describe('FileConsumer', () => {
  let fileConsumer: FileConsumer;
  const fakeUpload = jest.fn();
  const pathToStub = join(cwd(), 'src', '__stub__');
  const entries = [
    join(pathToStub, 'jsondocuments', 'batman.json'),
    join(pathToStub, 'jsondocuments', 'fightclub.json'),
  ];

  describe('when upload is successful', () => {
    beforeEach(() => {
      fileConsumer = new FileConsumer(fakeUpload, {maxConcurrent: 10});
      fakeUpload.mockResolvedValue({
        status: 202,
        statusText: 'All good',
      });
    });

    afterEach(() => {
      fakeUpload.mockReset();
    });

    it('should call callback on every batch upload', async () => {
      const mockedHandleSuccess = jest.fn();
      const documentCount = 5;
      const documentSize = 2; // mb
      const tmpDoc = createBatch(documentCount, documentSize);

      fileConsumer.expectedDocumentCount = documentCount;
      fileConsumer.onSuccess(mockedHandleSuccess);
      await fileConsumer.consume([tmpDoc.name]);

      expect(mockedHandleSuccess).toHaveBeenCalledTimes(3);
      expect(mockedHandleSuccess).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({remainingDocumentCount: 3})
      );
      expect(mockedHandleSuccess).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({remainingDocumentCount: 1})
      );
      expect(mockedHandleSuccess).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({remainingDocumentCount: 0})
      );
    });

    it('should call the success callback', async () => {
      const mockedHandleSuccess = jest.fn();
      fileConsumer.onSuccess(mockedHandleSuccess);
      await fileConsumer.consume(entries);
      expect(mockedHandleSuccess).toHaveBeenCalled();
    });

    it('should not call the error callback', async () => {
      const mockedHandleError = jest.fn();
      fileConsumer.onError(mockedHandleError);
      await fileConsumer.consume(entries);
      expect(mockedHandleError).not.toHaveBeenCalled();
    });

    it('should only push JSON files', async () => {
      const handleBatchUpload: SuccessfulUploadCallback = (
        data: UploadBatchCallbackData
      ) => {
        const expected = [
          'https://www.themoviedb.org/movie/268',
          'https://www.themoviedb.org/movie/999',
          'https://www.themoviedb.org/movie/550',
        ];
        for (let i = 0; i < data.batch.length; i++) {
          const documentBuilder = data.batch[i];
          expect(documentBuilder.marshal().documentId).toEqual(expected[i]);
        }
      };

      fileConsumer.onSuccess(handleBatchUpload);
      await fileConsumer.consume(entries);
    });
  });

  describe('when upload is in error', () => {
    let fileConsumer: FileConsumer;

    beforeEach(() => {
      fileConsumer = new FileConsumer(fakeUpload, {maxConcurrent: 10});
      fakeUpload.mockRejectedValueOnce({
        status: 412,
        statusText: 'BAD_REQUEST',
      });
    });

    it('should return the number of remaining documents', async () => {
      const mockedHandleError = jest.fn();
      const documentCount = 5;
      const documentSize = 2; // mb
      const tmpDoc = createBatch(documentCount, documentSize);

      fileConsumer.expectedDocumentCount = documentCount;
      fileConsumer.onError(mockedHandleError);
      await fileConsumer.consume([tmpDoc.name]);

      expect(mockedHandleError).toHaveBeenCalledTimes(1);
      expect(mockedHandleError).toHaveBeenCalledWith(
        {
          status: 412,
          statusText: 'BAD_REQUEST',
        },
        expect.objectContaining({remainingDocumentCount: 3}) // 2 out of 5 document processed... 3 remaiming
      );
    });

    it('should call the error callback', async () => {
      const mockedHandleError = jest.fn();
      fileConsumer.onError(mockedHandleError);
      await fileConsumer.consume(entries);

      expect(mockedHandleError).toHaveBeenCalled();
    });

    it('should call the error callback', async () => {
      const handleBatchError: FailedUploadCallback = (err: unknown) => {
        expect(err).toEqual({status: 412, statusText: 'BAD_REQUEST'});
      };

      fileConsumer.onError(handleBatchError);
      await fileConsumer.consume(entries);
    });
  });
});
