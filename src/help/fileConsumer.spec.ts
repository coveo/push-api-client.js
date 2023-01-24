jest.mock('../validation/parseFile');
import {
  DocumentBuilder,
  FailedUploadCallback,
  SuccessfulUploadCallback,
  UploadBatchCallbackData,
} from '..';
import {FileConsumer} from './fileConsumer';
import {parseAndGetDocumentBuilderFromJSONDocument} from '../validation/parseFile';

const mockedParse = jest.mocked(parseAndGetDocumentBuilderFromJSONDocument);

// generating 5 documents of 2 mb each
mockedParse.mockResolvedValue(generateDocBuilderBatch(5, 2));
function generateDocBuilderBatch(
  documentCount: number,
  documentSize: number
): DocumentBuilder[] {
  let counter = 1;
  const randomCharacter = '#';
  const bytes = documentSize * 1024 * 1024;
  const data = Buffer.alloc(bytes, randomCharacter).toString();
  const docBuilderFactory = () =>
    new DocumentBuilder(`https://url.com/${counter++}`, 'title').withData(data);

  return [...Array(documentCount)].map(docBuilderFactory);
}

describe('FileConsumer', () => {
  let fileConsumer: FileConsumer;
  const fakeUpload = jest.fn();
  const singleEntry = ['foo.json'];
  const entries = ['bar.json', 'baz.json'];

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
      const expectedSequence = [
        'https://url.com/1',
        'https://url.com/2',
        'https://url.com/3',
        'https://url.com/4',
        'https://url.com/5',
      ].values();
      const handleBatchUpload = (data: UploadBatchCallbackData) => {
        for (const element of data.batch) {
          const documentBuilder = element;
          const {documentId} = documentBuilder.marshal();
          expect(documentId).toEqual(expectedSequence.next().value);
        }
      };

      fileConsumer.onSuccess(handleBatchUpload);
      await fileConsumer.consume(singleEntry);
    });

    describe.each([
      {
        // 1 file with 5 documents of 2MB each => 10MB to upload => 3 batches: [4MB] [4MB] [2MB]
        title: 'when consume a single file',
        sequence: [2, 2, 1],
        entries: ['foo.json'],
      },
      {
        // 2 files with 5 documents each weighing 2MB => 20MB to upload => 5 batches: [4MB] [4MB] [4MB] [4MB] [4MB]
        title: 'when consume 2 files',
        sequence: [2, 2, 2, 2, 2],
        entries: ['foo.json', 'bar.json'],
      },
    ])('$title', ({sequence, entries}) => {
      it(`should create ${sequence.length} batches`, async () => {
        const batchOrder = sequence.values();
        const handleBatchUpload: SuccessfulUploadCallback = (data) =>
          expect(data.batch.length).toEqual(batchOrder.next().value);

        fileConsumer.onSuccess(handleBatchUpload);
        await fileConsumer.consume(entries);
      });

      it(`should call callback ${sequence.length} times`, async () => {
        const mockedHandleSuccess = jest.fn();
        fileConsumer.onSuccess(mockedHandleSuccess);
        await fileConsumer.consume(entries);
        expect(mockedHandleSuccess).toHaveBeenCalledTimes(sequence.length);
      });
    });

    describe('when the upload progress is returned', () => {
      const mockedHandleSuccess = jest.fn();
      const documentCount = 5;

      beforeEach(async () => {
        fileConsumer.expectedDocumentCount = documentCount;
        fileConsumer.onSuccess(mockedHandleSuccess);
        await fileConsumer.consume(singleEntry);
      });

      it('should call callback on every batch upload', async () => {
        expect(mockedHandleSuccess).toHaveBeenCalledTimes(3);
      });

      it('should return remaining and total documents at each call', async () => {
        expect(mockedHandleSuccess).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            progress: {remainingDocumentCount: 3, totalDocumentCount: 5},
          })
        );
        expect(mockedHandleSuccess).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            progress: {remainingDocumentCount: 1, totalDocumentCount: 5},
          })
        );
        expect(mockedHandleSuccess).toHaveBeenNthCalledWith(
          3,
          expect.objectContaining({
            progress: {remainingDocumentCount: 0, totalDocumentCount: 5},
          })
        );
      });
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

      fileConsumer.expectedDocumentCount = documentCount;
      fileConsumer.onError(mockedHandleError);
      await fileConsumer.consume(singleEntry);

      expect(mockedHandleError).toHaveBeenCalledTimes(1);
      expect(mockedHandleError).toHaveBeenCalledWith(
        {
          status: 412,
          statusText: 'BAD_REQUEST',
        },
        expect.objectContaining({
          progress: {remainingDocumentCount: 3, totalDocumentCount: 5},
        }) // 2 out of 5 document processed... 3 remaiming
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
