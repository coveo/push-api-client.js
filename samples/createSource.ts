import {Source, SourceVisibility} from '@coveo/push-api-client';

async function main() {
  const source = new Source('my_api_key', 'my_coveo_organization_id');

  const response = await source.create(
    'the_name_of_my_source',
    SourceVisibility.SECURED
  );
  console.log(`Successfully created source with ID:${response.id}`);
}

main();
