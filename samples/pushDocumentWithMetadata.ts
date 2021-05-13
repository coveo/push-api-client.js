import {Source, DocumentBuilder} from '@coveo/push-api-client';

async function main() {
  const source = new Source('my_api_key', 'my_coveo_organization_id');

  const myDocument = new DocumentBuilder(
    'https://my.document.uri',
    'My document title'
  )
    .withAuthor('bob')
    .withClickableUri('https://my.document.click.com')
    .withData('these words will be searchable')
    .withFileExtension('.html')
    .withMetadata({
      tags: ['the_first_tag', 'the_second_tag'],
      version: 1,
      somekey: 'some value',
    });

  await source.addOrUpdateDocument('my_source_id', myDocument);
}

main();
