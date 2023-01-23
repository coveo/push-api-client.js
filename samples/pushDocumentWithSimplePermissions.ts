import {
  PushSource,
  DocumentBuilder,
  UserSecurityIdentityBuilder,
  GroupSecurityIdentityBuilder,
  PermissionSetBuilder,
  VirtualGroupSecurityIdentityBuilder,
} from '@coveo/push-api-client';

// Combining Many Permission Sets Example
// Example explanation can be found in https://docs.coveo.com/en/107

const users = {
  asmith: 'asmith@example.com',
  emitchell: 'emitchell@example.com',
  mystery: 'MysteryUserX', // Alias resolving to emitchell@example.com
};

async function main() {
  const source = new PushSource('my_api_key', 'my_coveo_organization_id');

  // Allowing anyone except authenticated user asmith@example.com.
  const setA = new PermissionSetBuilder(true).withDeniedPermissions(
    new UserSecurityIdentityBuilder(users.asmith)
  );

  // Allowing authenticated users in the group SampleTeam1 and emitchell@example.com.
  const setB = new PermissionSetBuilder(false)
    .withAllowedPermissions(new GroupSecurityIdentityBuilder('SampleTeam1'))
    .withAllowedPermissions(new UserSecurityIdentityBuilder(users.emitchell));

  // Allowing authenticated user emitchell@example.com, and denies all users in the virtual group SampleGroup
  const setC = new PermissionSetBuilder(false)
    .withAllowedPermissions(new UserSecurityIdentityBuilder(users.mystery))
    .withDeniedPermissions(
      new VirtualGroupSecurityIdentityBuilder('SampleGroup')
    );

  const myDocument = new DocumentBuilder(
    'https://my.document.uri',
    'My document title'
  )
    .withPermissionSet(setA)
    .withPermissionSet(setB)
    .withPermissionSet(setC);

  await source.addOrUpdateDocument('my_source_id', myDocument);
}

main();
