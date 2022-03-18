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
  return axios.put(
    uploadURL.toString(),
    {
      addOrUpdate: batch.addOrUpdate.map((docBuilder) => docBuilder.marshal()),
      delete: batch.delete,
    },
    getFileContainerAxiosConfig(fileContainer)
  );
};

export const getFileContainerAxiosConfig = (
  fileContainer: FileContainerResponse
): AxiosRequestConfig => {
  return {
    headers: fileContainer.requiredHeaders,
  };
};
