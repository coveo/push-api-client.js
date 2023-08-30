import {
  PushSource,
  BatchUpdateDocuments,
  DocumentBuilder,
} from '@coveo/push-api-client';
async function main() {
  const source = new PushSource('my_api_key', 'my_coveo_organization_id', {
    retryAfter: 10000,
    ejectAfter: 600000,
  });
  source.setSourceStatus('my_source_id', 'REFRESH');

  const myBatchOfDocuments: BatchUpdateDocuments = {
    addOrUpdate: [
      new DocumentBuilder(
        'https://my.document.uri?ref=1',
        'my first document title'
      ),
      new DocumentBuilder(
        'https://my.document.uri?ref=2',
        'my second document title'
      ),
    ],
    delete: [
      {documentId: 'https://my.document.uri?ref=3', deleteChildren: true},
    ],
  };

  await source.batchUpdateDocuments('my_source_id', myBatchOfDocuments);
  source.setSourceStatus('my_source_id', 'IDLE');
}

main();
