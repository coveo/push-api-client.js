import {SecurityIdentity, SecurityIdentityType} from './document';

/**
 * Build a security identity. See {@link SecurityIdentity}.
 */
export interface SecurityIdentityBuilder {
  build(): SecurityIdentity | SecurityIdentity[];
}

/**
 * Build any {@link SecurityIdentityType}.
 *
 * Instead of using this class directly, use one of:
 * - {@link UserSecurityIdentityBuilder}
 * - {@link GroupSecurityIdentityBuilder}
 * - {@link VirtualGroupSecurityIdentityBuilder}
 */
export class AnySecurityIdentityBuilder implements SecurityIdentityBuilder {
  private securityIdentity: SecurityIdentity;
  /**
   *
   * @param identityType
   * @param identity
   * @param securityProvider
   */
  constructor(
    identityType: SecurityIdentityType,
    identity: string,
    securityProvider?: string
  ) {
    this.securityIdentity = {
      identityType,
      identity,
      securityProvider,
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
 * Typically used in conjunction with {@link DocumentBuilder.withAllowedPermissions} or {@link DocumentBuilder.withDeniedPermissions}.
 *
 * See {@link SecurityIdentity}.
 */
export class UserSecurityIdentityBuilder implements SecurityIdentityBuilder {
  /**
   * Pass either a single user, or an array of user to create multiple identities.
   * @param user
   * @param securityProvider
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
        new AnySecurityIdentityBuilder('USER', u, this.securityProvider).build()
      );
    }
    return new AnySecurityIdentityBuilder(
      'USER',
      this.user,
      this.securityProvider
    ).build();
  }
}

/**
 * Build a security identity of type `GROUP`.
 *
 * Typically used in conjunction with {@link DocumentBuilder.withAllowedPermissions} or {@link DocumentBuilder.withDeniedPermissions}.
 *
 * See {@link SecurityIdentity}.
 */
export class GroupSecurityIdentityBuilder implements SecurityIdentityBuilder {
  /**
   * Pass either a single `group`, or an array of `group` to create multiple identities.
   * @param group
   * @param securityProvider
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
          'GROUP',
          g,
          this.securityProvider
        ).build()
      );
    }
    return new AnySecurityIdentityBuilder(
      'GROUP',
      this.group,
      this.securityProvider
    ).build();
  }
}
/**
 * Build a security identity of type `VIRTUAL_GROUP`.
 *
 * Typically used in conjunction with {@link DocumentBuilder.withAllowedPermissions} or {@link DocumentBuilder.withDeniedPermissions}.
 *
 * See {@link SecurityIdentity}.
 */
export class VirtualGroupSecurityIdentityBuilder
  implements SecurityIdentityBuilder
{
  /**
   * Pass either a single `virtualGroup`, or an array of `virtualGroup` to create multiple identities.
   * @param group
   * @param securityProvider
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
          'VIRTUAL_GROUP',
          vg,
          this.securityProvider
        ).build()
      );
    }
    return new AnySecurityIdentityBuilder(
      'VIRTUAL_GROUP',
      this.virtualGroup,
      this.securityProvider
    ).build();
  }
}
