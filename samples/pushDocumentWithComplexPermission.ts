import {
  PushSource,
  DocumentBuilder,
  UserSecurityIdentityBuilder,
  GroupSecurityIdentityBuilder,
  PermissionSetBuilder
} from '@coveo/push-api-client';

// Complex Permission Model Definition Example
// Example explanation can be found in https://docs.coveo.com/en/25

const users = {
  asmith: 'asmith@example.com',
  bjones: 'bjones@example.com',
  cbrown: 'cbrown@example.com',
  dmoore: 'dmoore@example.com',
  emitchell: 'emitchell@example.com',
  mystery: 'MysteryUserX',
};

const permissionLevel1 = () => {
  const publicPermissionSet = new PermissionSetBuilder(true);

  const groupPermissionSet = new PermissionSetBuilder(false)
    .withAllowedPermissions(new GroupSecurityIdentityBuilder('SampleTeam1'))
    .withDeniedPermissions(new GroupSecurityIdentityBuilder('SampleTeam2'));

  const userPermissionSet = new PermissionSetBuilder(false)
    .withAllowedPermissions(
      new UserSecurityIdentityBuilder([users.asmith, users.cbrown])
    )
    .withDeniedPermissions(new UserSecurityIdentityBuilder(users.bjones));
  return [publicPermissionSet, groupPermissionSet, userPermissionSet];
};

const permissionLevel2 = () => {
  const userPermissionSet = new PermissionSetBuilder(false)
    .withAllowedPermissions(
      new UserSecurityIdentityBuilder([users.bjones, users.emitchell])
    )
    .withDeniedPermissions(new UserSecurityIdentityBuilder(users.asmith));

  const groupPermissionSet = new PermissionSetBuilder(
    false
  ).withAllowedPermissions(new UserSecurityIdentityBuilder('mystery'));

  return [userPermissionSet, groupPermissionSet];
};

async function main() {
  const source = new PushSource('my_api_key', 'my_coveo_organization_id');

  // Puttin everything toggether
  const myDocument = new DocumentBuilder(
    'https://my.document.uri',
    'My document title'
  )
    .withPermissionLevel('Permission level 1', permissionLevel1())
    .withPermissionLevel('Permission level 2', permissionLevel2());

  await source.addOrUpdateDocument('my_source_id', myDocument);
}

main();
