import type {Response} from 'undici';
import {URL} from 'node:url';
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
  let response: Response | undefined;
  const errors = [];
  try {
    response = await fetch(uploadURL.toString(), {
      method: 'PUT',
      body: JSON.stringify({
        addOrUpdate: batch.addOrUpdate.map((docBuilder) =>
          docBuilder.marshal()
        ),
        delete: batch.delete,
      }),
      headers: fileContainer.requiredHeaders,
    });
  } catch (error) {
    errors.push(error);
  } finally {
    if (response?.ok === false) {
      if (isMaxBodyLengthExceededError(response)) {
        addMaxBodyLengthError(errors, response);
      } else {
        addGenericFetchError(errors, response);
      }
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(errors);
  } else {
    return response!;
  }
};

function addGenericFetchError(
  errors: unknown[],
  response: Response | undefined
) {
  errors.push(new Error('Request failed', {cause: response}));
}

function addMaxBodyLengthError(
  errors: unknown[],
  response: Response | undefined
) {
  errors.push(
    new Error(
      'File container size limit exceeded.\nSee <https://docs.coveo.com/en/63/index-content/push-api-limits#request-size-limits>.',
      {cause: response}
    )
  );
}

function isMaxBodyLengthExceededError(response: Response | undefined) {
  return response?.status === 413;
}
