import {SecurityIdentity, SecurityIdentityType} from './document';

export interface SecurityIdentityBuilder {
  build(): SecurityIdentity | SecurityIdentity[];
}

export class AnySecurityIdentityBuilder implements SecurityIdentityBuilder {
  private securityIdentity: SecurityIdentity;
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

  public build() {
    return this.securityIdentity;
  }
}

export class UserSecurityIdentityBuilder implements SecurityIdentityBuilder {
  constructor(
    private user: string | string[],
    private securityProvider: string = 'EMAIL_SECURITY_PROVIDER'
  ) {}

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

export class GroupSecurityIdentityBuilder implements SecurityIdentityBuilder {
  constructor(
    private group: string | string[],
    private securityProvider?: string
  ) {}

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

export class VirtualGroupSecurityIdentityBuilder
  implements SecurityIdentityBuilder {
  constructor(
    private virtualGroup: string | string[],
    private securityProvider?: string
  ) {}

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
