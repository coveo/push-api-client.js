import {PermissionSetBuilder} from './permissionSetBuilder';
import {
  GroupSecurityIdentityBuilder,
  UserSecurityIdentityBuilder,
  VirtualGroupSecurityIdentityBuilder,
} from './securityIdentityBuilder';

describe('PermissionSetBuilder', () => {
  const bobUserIdentity = new UserSecurityIdentityBuilder('bob@foo.com');
  const multipleUsersIdentity = new UserSecurityIdentityBuilder([
    'max@foo.com',
    'sue@foo.com',
  ]);
  const groupIdentity = new GroupSecurityIdentityBuilder('my_group');
  const virtualGroupsIdentity = new VirtualGroupSecurityIdentityBuilder([
    'SampleGroup',
    'SpecialGroup',
  ]);
  let restrictedPermissionSet: PermissionSetBuilder;
  let openedPermissionSet: PermissionSetBuilder;

  beforeEach(() => {
    restrictedPermissionSet = new PermissionSetBuilder(false);
    openedPermissionSet = new PermissionSetBuilder(true);
  });

  it('should marshal allowAnonymous to false', () => {
    expect(restrictedPermissionSet.build()).toEqual(
      expect.objectContaining({allowAnonymous: false})
    );
  });

  it('should marshal allowAnonymous to true', () => {
    expect(openedPermissionSet.build()).toEqual(
      expect.objectContaining({allowAnonymous: true})
    );
  });

  it('should marshal allowedPermissions', () => {
    restrictedPermissionSet.withAllowedPermissions(bobUserIdentity);

    expect(restrictedPermissionSet.build()).toMatchObject({
      allowedPermissions: expect.arrayContaining([
        expect.objectContaining({identity: 'bob@foo.com'}),
      ]),
    });
  });

  it('should marshal allowedPermissions in multiple #withAllowedPermissions', () => {
    restrictedPermissionSet
      .withAllowedPermissions(multipleUsersIdentity)
      .withAllowedPermissions(bobUserIdentity)
      .withAllowedPermissions(virtualGroupsIdentity)
      .withAllowedPermissions(groupIdentity);

    expect(restrictedPermissionSet.build()).toMatchSnapshot();
  });

  it('should marshal deniedPermissions', () => {
    restrictedPermissionSet.withDeniedPermissions(
      new UserSecurityIdentityBuilder('bob@foo.com')
    );

    expect(restrictedPermissionSet.build()).toMatchObject({
      deniedPermissions: expect.arrayContaining([
        expect.objectContaining({identity: 'bob@foo.com'}),
      ]),
    });
  });

  it('should marshal deniedPermissions in multiple #withDeniedPermissions', () => {
    restrictedPermissionSet
      .withDeniedPermissions(multipleUsersIdentity)
      .withDeniedPermissions(bobUserIdentity)
      .withDeniedPermissions(virtualGroupsIdentity)
      .withDeniedPermissions(groupIdentity);

    expect(restrictedPermissionSet.build()).toMatchSnapshot();
  });

  it('should marshal both allowed and denied permissions ', () => {
    restrictedPermissionSet
      .withDeniedPermissions(multipleUsersIdentity)
      .withDeniedPermissions(bobUserIdentity)
      .withAllowedPermissions(virtualGroupsIdentity)
      .withAllowedPermissions(groupIdentity);

    expect(restrictedPermissionSet.build()).toMatchSnapshot();
  });
});
