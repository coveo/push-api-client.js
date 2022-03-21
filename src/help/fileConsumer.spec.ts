jest.mock('axios');

import {join} from 'path';
import {cwd} from 'process';
import {
  FailedUploadCallback,
  SuccessfulUploadCallback,
  UploadBatchCallbackData,
} from '..';
import {FileConsumer} from './fileConsumer';

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
      fakeUpload.mockResolvedValueOnce({
        status: 202,
        statusText: 'All good',
      });
    });

    it('should call the success callback', async () => {
      const mockedHandleSuccess = jest.fn();
      const {onBatchUpload, done} = fileConsumer.consume(entries);

      onBatchUpload(mockedHandleSuccess);
      await done();
      expect(mockedHandleSuccess).toHaveBeenCalled();
    });

    it('should not call the error callback', async () => {
      const mockedHandleError = jest.fn();
      const {onBatchError, done} = fileConsumer.consume(entries);

      onBatchError(mockedHandleError);
      await done();
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

      const {onBatchUpload, done} = fileConsumer.consume(entries);

      onBatchUpload(handleBatchUpload);
      await done();
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

    it('should call the error callback', async () => {
      const mockedHandleError = jest.fn();
      const {onBatchError, done} = fileConsumer.consume(entries);

      onBatchError(mockedHandleError);
      await done();
      expect(mockedHandleError).toHaveBeenCalled();
    });

    it('should call the error callback', async () => {
      const handleBatchError: FailedUploadCallback = (err: unknown) => {
        expect(err).toEqual({status: 412, statusText: 'BAD_REQUEST'});
      };

      const {onBatchError, done} = fileConsumer.consume(entries);
      onBatchError(handleBatchError);
      await done();
    });
  });
});
