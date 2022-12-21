import {PathLike} from 'fs';
import {
  ArrayValue,
  BooleanValue,
  PrimitivesValues,
  RecordValue,
  StringValue,
} from '@coveo/bueno';
import {Document} from '../document';
import {AnySecurityIdentityBuilder} from '../securityIdentityBuilder';
import {CaseInsensitiveDocument, Recordable} from './caseInsensitiveDocument';
import {DocumentBuilder} from '../documentBuilder';
import {InvalidDocument} from '../errors';
import {KnownKeys} from './knownKey';
import {PermissionSection, PermissionSetBuilder} from '../permissionSetBuilder';
import {RequiredKeyValidator} from './requiredKeyValidator';
import {
  PermissionSet,
  PermissionLevel,
  Permission,
  PermissionIdentityType,
} from '@coveo/platform-client';

class PermissionParser {
  public constructor(
    private caseInsensitiveDoc: CaseInsensitiveDocument<PrimitivesValues>,
    private documentBuilder: DocumentBuilder,
    private documentPath: PathLike
  ) {}

  public processPermissionList() {
    this.ensurePermissionArray();
    new KnownKeys<Document['permissions']>(
      'permissions',
      this.caseInsensitiveDoc
    ).whenExists((permissions) => {
      permissions!.forEach(
        (
          permission: Recordable<PermissionSet> | Recordable<PermissionLevel>
        ) => {
          const caseInsensitivePermission =
            new CaseInsensitiveDocument<PrimitivesValues>(permission);

          new KnownKeys('permissionsets', caseInsensitivePermission)
            .whenExists<PermissionLevel>((permissionLevel) =>
              this.processPermissionLevel(permissionLevel)
            )
            .whenDoesNotExist<PermissionSet>((permissionSet) =>
              this.processPermissionSet(permissionSet)
            );
        }
      );

      this.caseInsensitiveDoc.delete('permissions');
    });
  }

  private processPermissionSet = (permissionSet: PermissionSet) => {
    const permissionSetBuilder =
      this.validateRequiredPermissionSetKeysAndGetPermissionSetBuilder(
        permissionSet
      );

    this.documentBuilder.withPermissionSet(permissionSetBuilder);
  };

  private processPermissionLevel(permission: Recordable<PermissionLevel>) {
    // TODO: require at least some permissions
    const permissionSetBuilders = permission.permissionSets!.map(
      (permissionSet) => {
        const caseInsensitivePermissions = new CaseInsensitiveDocument(
          permission
        );
        const {isValid, explanation} = new RequiredKeyValidator<string>(
          'name',
          caseInsensitivePermissions,
          new StringValue({required: true, emptyAllowed: false})
        );
        if (!isValid) {
          this.throwInvalidDocumentError(explanation);
        }
        return this.validateRequiredPermissionSetKeysAndGetPermissionSetBuilder(
          permissionSet
        );
      }
    );

    // TODO: prevent empty permission set
    this.documentBuilder.withPermissionLevel(
      permission.name!,
      permissionSetBuilders
    );
  }

  private validateAllowAnonymous(
    caseInsensitivePermissions: CaseInsensitiveDocument<PrimitivesValues>
  ): boolean | never {
    const {isValid, explanation, value} = new RequiredKeyValidator(
      'allowanonymous',
      caseInsensitivePermissions,
      new BooleanValue({required: true})
    );
    if (!isValid) {
      this.throwInvalidDocumentError(explanation);
    }
    return value!;
  }

  private validatePermission(
    permissionLogic: Lowercase<PermissionSection>,
    caseInsensitivePermissions: CaseInsensitiveDocument<PrimitivesValues>
  ) {
    const {isValid, explanation, value} = new RequiredKeyValidator(
      permissionLogic,
      caseInsensitivePermissions,
      this.getSecurityIdentitySchemaValidation()
    );

    if (!isValid) {
      this.throwInvalidDocumentError(explanation);
    }

    return value;
  }

  private validateRequiredPermissionSetKeysAndGetPermissionSetBuilder(
    permission: Recordable<PermissionSet>
  ): PermissionSetBuilder {
    const caseInsensitivePermissions = new CaseInsensitiveDocument(permission);
    const allowAnonymous = this.validateAllowAnonymous(
      caseInsensitivePermissions
    );
    const allowedPermissions = this.validatePermission(
      'allowedpermissions',
      caseInsensitivePermissions
    );
    const deniedPermissions = this.validatePermission(
      'deniedpermissions',
      caseInsensitivePermissions
    );

    const permissionSetBuilder = new PermissionSetBuilder(allowAnonymous);

    allowedPermissions?.forEach(
      ({identity, identityType, securityProvider}: Permission) => {
        permissionSetBuilder.withAllowedPermissions(
          new AnySecurityIdentityBuilder(
            identityType!,
            identity!,
            securityProvider
          )
        );
      }
    );

    deniedPermissions?.forEach(
      ({identity, identityType, securityProvider}: Permission) => {
        permissionSetBuilder.withDeniedPermissions(
          new AnySecurityIdentityBuilder(
            identityType!,
            identity!,
            securityProvider
          )
        );
      }
    );

    return permissionSetBuilder;
  }

  private get identityTypeRegex() {
    const identityTypesValues = Object.values(PermissionIdentityType);
    return new RegExp(identityTypesValues.join('|'), 'i');
  }

  private getSecurityIdentitySchemaValidation(): ArrayValue<Permission> {
    return new ArrayValue({
      required: false,
      each: new RecordValue({
        values: {
          identity: new StringValue({required: true, emptyAllowed: false}),
          identityType: new StringValue({
            regex: this.identityTypeRegex,
            required: true,
            emptyAllowed: false,
          }),
          securityProvider: new StringValue({
            emptyAllowed: true,
            required: false,
          }),
        },
      }),
    });
  }

  private ensurePermissionArray() {
    const validator = (schema: ArrayValue<PrimitivesValues>) =>
      new RequiredKeyValidator('permissions', this.caseInsensitiveDoc, schema);
    const {isValid, explanation} = validator(new ArrayValue({required: false}));
    const requiredAtLeastOnePermission = validator(new ArrayValue({min: 1}));

    if (!isValid) {
      this.throwInvalidDocumentError(explanation);
    }

    if (!requiredAtLeastOnePermission.isValid) {
      // simply discard empty array permission instead of throwing
      this.caseInsensitiveDoc.delete('permissions');
    }
  }

  private throwInvalidDocumentError(explanation: string): never {
    throw new InvalidDocument(
      this.documentPath,
      this.caseInsensitiveDoc.originalDocument,
      explanation
    );
  }
}

export const processPermissionList = (
  caseInsensitiveDoc: CaseInsensitiveDocument<PrimitivesValues>,
  documentBuilder: DocumentBuilder,
  documentPath: PathLike
) => {
  const parser = new PermissionParser(
    caseInsensitiveDoc,
    documentBuilder,
    documentPath
  );
  return parser.processPermissionList();
};
