jest.mock('axios');

import axios from 'axios';
import {BatchUpdateDocuments, DocumentBuilder} from '..';
import {
  FileContainerResponse,
  uploadContentToFileContainer,
} from './fileContainer';

describe('FileContainer', () => {
  const mockAxios = axios as jest.Mocked<typeof axios>;
  const fileContainerResponse: FileContainerResponse = {
    uploadUri: 'https://fake.upload.url',
    fileId: 'file_id',
    requiredHeaders: {foo: 'bar'},
  };

  const batch: BatchUpdateDocuments = {
    addOrUpdate: [new DocumentBuilder('http://some.url', 'Some document')],
    delete: [],
  };

  it('sould perform an PUT request with the right params', async () => {
    await uploadContentToFileContainer(fileContainerResponse, batch);

    expect(mockAxios.put).toHaveBeenCalledWith(
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
      }
    );
  });
});
