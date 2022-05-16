import type {AxiosResponse} from 'axios';
import type {DocumentBuilder} from './documentBuilder';
import type {Transformer} from './validation/transformers/transformer';
// Used for Documentation.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type {BuiltInTransformers} from './validation/transformers/transformer';

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
}

export interface ParseDocumentOptions {
  /**
   * The {@link Transformer} to apply to the fields found in the parsed documents.
   * If not specified, no transformation will be applied to the field names.
   * A Transformer is useful to prevent getting errors whenever some of field names contain special characters or any other element not supported by the Platform.
   *
   * For a list of built-in transformers, use {@link BuiltInTransformers}.
   *
   * @default BuiltInTransformers.identity
   */
  fieldNameTransformer?: Transformer;
}
export interface ConcurrentProcessing {
  /**
   * The maximum number of requests to send concurrently to the Coveo platform.
   * Increasing this value will increase the speed at which documents are pushed but will also consume more memory.
   *
   * @default 10
   */
  maxConcurrent?: number;
}

export type BatchUpdateDocumentsFromFiles = BatchUpdateDocumentsOptions &
  ConcurrentProcessing &
  ParseDocumentOptions;
