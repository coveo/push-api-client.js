import axios, {AxiosRequestConfig} from 'axios';
import {URL} from 'url';
import {BatchUpdateDocuments} from '../interfaces';
import {FileConsumer} from './fileConsumer';

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
  const buffer = 1e6; // One megabyte buffer
  return {
    headers: fileContainer.requiredHeaders,
    maxBodyLength: FileConsumer.maxContentLength + buffer,
  };
};

function isMaxBodyLengthExceededError(err: Error & {code?: string}) {
  return err?.code === 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED';
}
