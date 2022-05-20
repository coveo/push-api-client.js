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
          '\nTry setting and/or increasing `axios.defaults.maxBodyLength`.';
      }
      throw err;
    });
};

export const getFileContainerAxiosConfig = (
  fileContainer: FileContainerResponse
): AxiosRequestConfig => {
  return {
    headers: fileContainer.requiredHeaders,
  };
};

function isMaxBodyLengthExceededError(err: Error & {code?: string}) {
  return err?.code === 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED';
}
