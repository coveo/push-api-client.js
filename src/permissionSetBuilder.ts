import {PermissionSetModel} from './document';
import {SecurityIdentityBuilder} from './securityIdentityBuilder';

export class PermissionSetBuilder {
  private permissionSet: PermissionSetModel;

  /**
   * Creates an instance of PermissionSetBuilder.
   * TODO: document on permission set
   * @param {boolean} allowAnonymous Set allowAnonymous for permissions on the document
   */
  public constructor(allowAnonymous: boolean) {
    this.permissionSet = {allowAnonymous};
  }

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
   * Build and return the security identity or identities.
   * @returns
   */
  public build(): PermissionSetModel {
    return this.permissionSet;
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
