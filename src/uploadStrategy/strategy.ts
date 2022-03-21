import {AxiosResponse} from 'axios';
import type {
  FailedUploadCallback,
  SuccessfulUploadCallback,
} from '../help/fileConsumer';
import type {BatchUpdateDocuments, ConcurrentProcessing} from '../interfaces';

export interface UploadStrategy {
  /**
   * Upload documents from a list of file path
   *
   * @param {string[]} files paths to upload
   * @param {Required<ConcurrentProcessing>} processingConfig
   */
  uploadFiles: (
    files: string[],
    processingConfig: Required<ConcurrentProcessing>
  ) => {
    onBatchError: (callback: FailedUploadCallback) => void;
    onBatchUpload: (callback: SuccessfulUploadCallback) => void;
    done: () => Promise<void>;
  };
  /**
   * Upload a batch of documents
   *
   * @param {BatchUpdateDocuments} batch
   */
  uploadBatch: (batch: BatchUpdateDocuments) => Promise<AxiosResponse>;
}
