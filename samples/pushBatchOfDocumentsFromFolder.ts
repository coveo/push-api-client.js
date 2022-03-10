import {PushSource, UploadBatchCallbackData} from '@coveo/push-api-client';

function onSuccessCallback({batch, files, res}: UploadBatchCallbackData) {
  const numAdded = batch.length;
  let fileNames = files.slice(0, 5).join(', ');
  if (files.length > 5) {
    fileNames += ` and ${files.length - 5} more ...`;
  }
  console.log(
    `Success: ${numAdded} document${
      numAdded > 1 ? 's' : ''
    } accepted by the Push API from ${fileNames}.`
  );
  console.log(`         Status code: ${(res?.status, res?.statusText)}
        `);
}

function onErrorCallback(err: unknown, {files}: UploadBatchCallbackData) {
  console.log(`Something went wrong while uploading files ${files}`, err);
}

async function main() {
  const source = new PushSource('my_api_key', 'my_coveo_organization_id');
  source.setSourceStatus('my_source_id', 'REFRESH');

  /**
   * You can push from files and folders containing JSON files.
   * Only JSON files will be considered if the folder contains other filetype extensions.
   */
  const entries = [
    '/path/to/folder',
    '/path/to/fileA.json',
    '/path/to/fileB.json',
  ];

  const {onBatchUpload, onBatchError, done} =
    await source.batchUpdateDocumentsFromFiles('my_source_id', entries);

  onBatchUpload(onSuccessCallback);
  onBatchError(onErrorCallback);
  await done();

  source.setSourceStatus('my_source_id', 'IDLE');
}

main();
