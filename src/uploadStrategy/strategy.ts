import type {AxiosResponse} from 'axios';
import type {BatchUpdateDocuments} from '../interfaces';

export interface UploadStrategy {
  /**
   * Upload a batch of documents
   *
   * @param {BatchUpdateDocuments} batch
   */
  uploadBatch: (batch: BatchUpdateDocuments) => Promise<AxiosResponse>;
}
