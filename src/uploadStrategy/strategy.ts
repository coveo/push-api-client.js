import type {AxiosResponse} from 'axios';
import type {BatchUpdateDocuments} from '../interfaces';

export interface UploadStrategy {
  /**
   * Upload a batch of documents
   *
   * @param {BatchUpdateDocuments} batch
   */
  upload: (batch: BatchUpdateDocuments) => Promise<AxiosResponse>;

  /**
   * Async operation to run before starting the upload
   * This can be useful if a task should to run before the parallel uploads
   *
   * @memberof UploadStrategy
   */
  preUpload?: () => Promise<void>;

  /**
   * Async operation to run once the batch upload is complete
   *
   * @memberof UploadStrategy
   */
  postUpload?: () => Promise<void>;
}
