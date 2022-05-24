import axios, {AxiosRequestConfig} from 'axios';
import {URL} from 'url';
import {BatchUpdateDocuments} from '../interfaces';

export interface FileContainerResponse {
  uploadUri: string;
  fileId: string;
  requiredHeaders: Record<string, string>;
}

export const uploadContentToFileContainer = async (
  fileContainer: FileContainerResponse,
  batch: BatchUpdateDocuments
) => {
  const uploadURL = new URL(fileContainer.uploadUri);
  return axios
    .put(
      uploadURL.toString(),
      {
        addOrUpdate: batch.addOrUpdate.map((docBuilder) =>
          docBuilder.marshal()
        ),
        delete: batch.delete,
      },
      getFileContainerAxiosConfig(fileContainer)
    )
    .catch((err) => {
      if (isMaxBodyLengthExceededError(err)) {
        err.message +=
          '\nFile size is limited to 5 MB.\nSee <https://docs.coveo.com/en/63/index-content/push-api-limits#request-size-limits>.';
      }
      throw err;
    });
};

export const getFileContainerAxiosConfig = (
  fileContainer: FileContainerResponse
): AxiosRequestConfig => {
  return {
    headers: fileContainer.requiredHeaders,
    maxBodyLength: 5e3,
  };
};

function isMaxBodyLengthExceededError(err: Error & {code?: string}) {
  return err?.code === 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED';
}
