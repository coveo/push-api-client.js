import {Source} from '@coveo/push-api-client';

async function main() {
  const source = new Source('my_api_key', 'my_coveo_organization_id');

  await source.deleteDocument(
    'my_source_id',
    'https://my.document.to.delete.uri',
    true
  );
}

main();
