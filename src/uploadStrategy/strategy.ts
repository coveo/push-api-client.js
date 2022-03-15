import {AxiosResponse} from 'axios';
import type {
  FailedUploadCallback,
  SuccessfulUploadCallback,
} from '../help/fileConsumer';
import type {BatchUpdateDocuments, ConcurrentProcessing} from '../interfaces';

export interface Strategy {
  doTheMagic: (
    files: string[],
    processingConfig: Required<ConcurrentProcessing>
  ) => Promise<{
    onBatchError: (callback: FailedUploadCallback) => void;
    onBatchUpload: (callback: SuccessfulUploadCallback) => void;
    done: () => Promise<void>;
  }>;
  doTheMagicSingleBatch: (
    batch: BatchUpdateDocuments
  ) => Promise<AxiosResponse>;
}
