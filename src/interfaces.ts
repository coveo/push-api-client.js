import type {AxiosResponse} from 'axios';
import type {DocumentBuilder} from './documentBuilder';

export interface BatchUpdateDocuments {
  addOrUpdate: DocumentBuilder[];
  delete: {documentId: string; deleteChildren: boolean}[];
}

/**
 *
 * @param {string[]} files Files from which the documentBuilders were generated
 * @param {DocumentBuilder[]} batch List of the uploaded DocumentBuilders
 * @param {AxiosResponse} res Axios response
 */
export interface UploadBatchCallbackData {
  files: string[];
  batch: DocumentBuilder[];
  res?: AxiosResponse;
}

export interface BatchUpdateDocumentsOptions {
  /**
   * Whether to create the missing fields required in the index based on the document batch metadata.
   *
   * Make sure your API key is granted the privilege to EDIT fields before using this option.
   * See https://docs.coveo.com/en/1707#fields-domain
   */
  createFields?: boolean;
  /**
   * TODO: find a better name
   * ex: throwForInvalidFieldNames
   */
  formatInvalidFields?: boolean;
  // TODO: In a breaking change, move every autofield creation related options into a separate interface to avoid confusion
}

export interface ConcurrentProcessing {
  /**
   * The maximum number of requests to send concurrently to the Coveo platform.
   * Increasing this value will increase the speed at which documents are pushed but will also consume more memory.
   *
   * The default value is set to 10.
   */
  maxConcurrent?: number;
}

export type BatchUpdateDocumentsFromFiles = BatchUpdateDocumentsOptions &
  ConcurrentProcessing;
