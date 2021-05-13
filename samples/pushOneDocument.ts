import {Source, DocumentBuilder} from '@coveo/push-api-client';

async function main() {
  const source = new Source('my_api_key', 'my_coveo_organization_id');

  const myDocument = new DocumentBuilder(
    'https://my.document.uri',
    'My document title'
  ).withData('these words will be searchable');

  await source.addOrUpdateDocument('my_source_id', myDocument);
}

main();
