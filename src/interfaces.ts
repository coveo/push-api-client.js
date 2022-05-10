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
   *
   * @default true
   */
  createFields?: boolean;
  /**
   * Allow the fields to be added to the source mappings when the `createFields` option is `true`.
   * Setting this option to `false` might prevent future Resource Snashots to find children fields of a source.
   *
   * @default true
   */
  // TODO:??? Provide an option to update source mapping with custom fields
  // addFieldsToSourceMappings?: boolean;
  /**
   * Allow fields with unsupported names to be automatically normalized.
   * Setting this option to `true` will create the normalized fields in your Coveo organization.
   * Otherwise, an error will be thrown as soon as an unsupported field is detected.
   *
   * @default false
   */
  normalizeFields?: boolean;
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
