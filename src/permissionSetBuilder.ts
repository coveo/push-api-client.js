import {PermissionSet} from '@coveo/platform-client';
import {SecurityIdentityBuilder} from './securityIdentityBuilder';

export type PermissionSection = keyof Pick<
  PermissionSet,
  'allowedPermissions' | 'deniedPermissions'
>;

export class PermissionSetBuilder {
  private permissionSet: PermissionSet;

  /**
   * Builds a Permission Set Model
   *
   * See[Simple Permission Model Definition](https://docs.coveo.com/en/107/index-content/simple-permission-model-definition-examples)
   * @param {boolean} allowAnonymous Whether to allow anonymous users in this permission set
   */
  public constructor(allowAnonymous: boolean) {
    this.permissionSet = {
      allowAnonymous,
      allowedPermissions: [],
      deniedPermissions: [],
    };
  }

  /**
   * Set allowed identities on the document. See {@link PermissionSet}
   *
   * When the {@link PermissionsSetBuilder} class is instanciated with `allowAnonymous` property set to `true`, calling this method is redundant, and can therefore be omitted.
   * @param securityIdentityBuilder The allowed security identities to add to the permission set
   * @returns
   */
  public withAllowedPermissions(
    securityIdentityBuilder: SecurityIdentityBuilder
  ) {
    this.setPermission(securityIdentityBuilder, 'allowedPermissions');
    return this;
  }

  /**
   * Set denied identities on the document. See {@link PermissionSet}
   *
   * @param securityIdentityBuilder The denied security identities to add to the permission set
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
  public build(): PermissionSet {
    return this.permissionSet;
  }

  private setPermission(
    securityIdentityBuilder: SecurityIdentityBuilder,
    permissionSection: PermissionSection
  ) {
    const identities = securityIdentityBuilder.build();
    if (Array.isArray(identities)) {
      this.permissionSet[permissionSection] =
        this.permissionSet[permissionSection]?.concat(identities);
    } else {
      this.permissionSet[permissionSection]?.push(identities);
    }
  }
}
