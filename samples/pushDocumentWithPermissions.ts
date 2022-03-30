import {
  PushSource,
  DocumentBuilder,
  UserSecurityIdentityBuilder,
} from '@coveo/push-api-client';

async function main() {
  const source = new PushSource('my_api_key', 'my_coveo_organization_id');

  const allowedUsers = new UserSecurityIdentityBuilder([
    'bob@sample.com',
    'john@sample.com',
  ]);

  const deniedUsers = new UserSecurityIdentityBuilder([
    'jane@sample.com',
    'jack@sample.com',
  ]);

  const myDocument = new DocumentBuilder(
    'https://my.document.uri',
    'My document title'
  )
    .withAllowAnonymousUsers(false)
    .withAllowedPermissions(allowedUsers)
    .withDeniedPermissions(deniedUsers);

  await source.addOrUpdateDocument('my_source_id', myDocument);
}

main();
