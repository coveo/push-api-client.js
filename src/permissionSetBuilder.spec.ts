import {PermissionSetModel} from './document';
import {SecurityIdentityBuilder} from './securityIdentityBuilder';

export class PermissionSetBuilder {
  private permissionSet: Partial<PermissionSetModel> = {};

  public constructor() {}

  /**
   * Set allowed identities on the document. See {@link Document.permissions}
   * @param securityIdentityBuilder
   * @returns
   */
  public withAllowedPermissions(
    securityIdentityBuilder: SecurityIdentityBuilder
  ) {
    this.setPermission(securityIdentityBuilder, 'allowedPermissions');
    return this;
  }

  /**
   * Set denied identities on the document. See {@link Document.permissions}
   * @param securityIdentityBuilder
   * @returns
   */
  public withDeniedPermissions(
    securityIdentityBuilder: SecurityIdentityBuilder
  ) {
    this.setPermission(securityIdentityBuilder, 'deniedPermissions');
    return this;
  }

  /**
   * Set allowAnonymous for permissions on the document. See {@link Document.permissions}
   * @param allowAnonymous
   * @returns
   */
  public withAllowAnonymousUsers(allowAnonymous: boolean) {
    this.permissionSet.allowAnonymous = allowAnonymous;
    return this;
  }

  private setPermission(
    securityIdentityBuilder: SecurityIdentityBuilder,
    permissionSection: 'allowedPermissions' | 'deniedPermissions'
  ) {
    const identities = securityIdentityBuilder.build();
    if (!this.permissionSet[permissionSection]) {
      this.permissionSet[permissionSection] = [];
    }
    if (Array.isArray(identities)) {
      this.permissionSet[permissionSection] =
        this.permissionSet[permissionSection]?.concat(identities);
    } else {
      this.permissionSet[permissionSection]?.push(identities);
    }
  }
}
