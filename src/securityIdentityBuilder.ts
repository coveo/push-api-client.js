// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type {PermissionSetBuilder} from './permissionSetBuilder';
import {Permission, PermissionIdentityType} from '@coveo/platform-client';

/**
 * Build a security identity. See {@link Permission}.
 */
export interface SecurityIdentityBuilder {
  build(): Permission | Permission[];
}

/**
 * Build any {@link PermissionIdentityType}.
 *
 * Instead of using this class directly, use one of:
 * - {@link UserSecurityIdentityBuilder}
 * - {@link GroupSecurityIdentityBuilder}
 * - {@link VirtualGroupSecurityIdentityBuilder}
 */
export class AnySecurityIdentityBuilder implements SecurityIdentityBuilder {
  private securityIdentity: Permission;
  /**
   * @param identityType  The type of the identity.
   * Valid values:
   * - `UNKNOWN`
   * - `USER` : Defines a single user.
   * - `GROUP` : Defines an existing group of identities within the indexed system. Individual members of this group can be of any valid identity Type (USER, GROUP, or VIRTUAL_GROUP).
   * - `VIRTUAL_GROUP` : Defines a group that doesn't exist within the indexed system. Mechanically, a `VIRTUAL_GROUP` is identical to a `GROUP`.
   *
   * @param identity The name of the security identity.
   * Examples:
   * - `asmith@example.com`
   * - `SampleTeam2`
   *
   * @param securityProvider The security identity provider through which the security identity is updated. Defaults to the first security identity provider associated with the target source.
   */
  constructor(
    identityType: PermissionIdentityType,
    identity: string,
    securityProvider?: string
  ) {
    this.securityIdentity = {
      identityType,
      identity,
      ...(securityProvider && {securityProvider}),
    };
  }

  /**
   * Build and return the security identity.
   * @returns
   */
  public build() {
    return this.securityIdentity;
  }
}

/**
 * Build a security identity of type `USER`.
 *
 * Typically used in conjunction with {@link PermissionSetBuilder.withAllowedPermissions} or {@link PermissionSetBuilder.withDeniedPermissions}.
 *
 * See {@link Permission}.
 */
export class UserSecurityIdentityBuilder implements SecurityIdentityBuilder {
  /**
   * Pass either a single user, or an array of user to create multiple identities.
   * @param {(string | string[])} user  The user identity or identities
   * @param {string} [securityProvider='Email Security Provider'] The security identity provider through which the security identity is updated. Defaults to the first security identity provider associated with the target source.
   */
  constructor(
    private user: string | string[],
    private securityProvider: string = 'Email Security Provider'
  ) {}

  /**
   * Build and return the security identity or identities.
   * @returns
   */
  public build() {
    if (Array.isArray(this.user)) {
      return this.user.map((u) =>
        new AnySecurityIdentityBuilder(
          PermissionIdentityType.User,
          u,
          this.securityProvider
        ).build()
      );
    }
    return new AnySecurityIdentityBuilder(
      PermissionIdentityType.User,
      this.user,
      this.securityProvider
    ).build();
  }
}

/**
 * Build a security identity of type `GROUP`.
 *
 * Typically used in conjunction with {@link PermissionSetBuilder.withAllowedPermissions} or {@link PermissionSetBuilder.withDeniedPermissions}.
 *
 * See {@link Permission}.
 */
export class GroupSecurityIdentityBuilder implements SecurityIdentityBuilder {
  /**
   * Pass either a single `group`, or an array of `group` to create multiple identities.
   * @param {(string | string[])} group
   * @param {string} [securityProvider] The security identity provider through which the security identity is updated. Defaults to the first security identity provider associated with the target source.
   */
  constructor(
    private group: string | string[],
    private securityProvider?: string
  ) {}

  /**
   * Build and return the security identity or identities.
   * @returns
   */
  public build() {
    if (Array.isArray(this.group)) {
      return this.group.map((g) =>
        new AnySecurityIdentityBuilder(
          PermissionIdentityType.Group,
          g,
          this.securityProvider
        ).build()
      );
    }
    return new AnySecurityIdentityBuilder(
      PermissionIdentityType.Group,
      this.group,
      this.securityProvider
    ).build();
  }
}
/**
 * Build a security identity of type `VIRTUAL_GROUP`.
 *
 * Typically used in conjunction with {@link PermissionSetBuilder.withAllowedPermissions} or {@link PermissionSetBuilder.withDeniedPermissions}.
 *
 * See {@link Permission}.
 */
export class VirtualGroupSecurityIdentityBuilder
  implements SecurityIdentityBuilder
{
  /**
   * Pass either a single `virtualGroup`, or an array of `virtualGroup` to create multiple identities.
   * @param {(string | string[])} virtualGroup
   * @param {string} [securityProvider] The security identity provider through which the security identity is updated. Defaults to the first security identity provider associated with the target source.
   */
  constructor(
    private virtualGroup: string | string[],
    private securityProvider?: string
  ) {}

  /**
   * Build and return the security identity or identities.
   * @returns
   */
  public build() {
    if (Array.isArray(this.virtualGroup)) {
      return this.virtualGroup.map((vg) =>
        new AnySecurityIdentityBuilder(
          PermissionIdentityType.VirtualGroup,
          vg,
          this.securityProvider
        ).build()
      );
    }
    return new AnySecurityIdentityBuilder(
      PermissionIdentityType.VirtualGroup,
      this.virtualGroup,
      this.securityProvider
    ).build();
  }
}
