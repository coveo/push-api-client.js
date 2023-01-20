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

export const processPermissionList = (
  caseInsensitiveDoc: CaseInsensitiveDocument<PrimitivesValues>,
  documentBuilder: DocumentBuilder,
  documentPath: PathLike
) => {
  ensurePermissionArray(caseInsensitiveDoc, documentPath);
  new KnownKeys<Document['permissions']>(
    'permissions',
    caseInsensitiveDoc
  ).whenExists((permissions) => {
    permissions!.forEach(
      (permission: Recordable<PermissionSet> | Recordable<PermissionLevel>) => {
        const caseInsensitivePermission =
          new CaseInsensitiveDocument<PrimitivesValues>(permission);

        new KnownKeys('permissionsets', caseInsensitivePermission)
          .whenExists<PermissionLevel>((permissionLevel) =>
            processPermissionLevel(
              permissionLevel,
              documentBuilder,
              documentPath
            )
          )
          .whenDoesNotExist<PermissionSet>((permissionSet) =>
            processPermissionSet(permissionSet, documentBuilder, documentPath)
          );
      }
    );

    delete caseInsensitiveDoc.documentRecord['permissions'];
  });
};

const processPermissionSet = (
  permissionSet: PermissionSet,
  documentBuilder: DocumentBuilder,
  documentPath: PathLike
) => {
  const permissionSetBuilder =
    validateRequiredPermissionSetKeysAndGetPermissionSetBuilder(
      permissionSet,
      documentPath
    );

  documentBuilder.withPermissionSet(permissionSetBuilder);
};

const processPermissionLevel = (
  permission: Recordable<PermissionLevel>,
  documentBuilder: DocumentBuilder,
  documentPath: PathLike
) => {
  // TODO: CDX-1282: require at least some permissions
  const permissionSetBuilders = permission.permissionSets!.map(
    (permissionSet) => {
      const caseInsensitivePermissions = new CaseInsensitiveDocument(
        permission
      );
      const requiredPermissionLevelName = new RequiredKeyValidator<string>(
        'name',
        caseInsensitivePermissions,
        new StringValue({required: true, emptyAllowed: false})
      );
      if (!requiredPermissionLevelName.isValid) {
        throw new InvalidDocument(
          documentPath,
          requiredPermissionLevelName.explanation
        );
      }
      return validateRequiredPermissionSetKeysAndGetPermissionSetBuilder(
        permissionSet,
        documentPath
      );
    }
  );

  // TODO: CDX-1282: prevent empty permission set
  documentBuilder.withPermissionLevel(permission.name!, permissionSetBuilders);
};

const validateAllowAnonymous = (
  caseInsensitivePermissions: CaseInsensitiveDocument<PrimitivesValues>,
  documentPath: PathLike
): boolean | never => {
  const requiredAllowAnonymous = new RequiredKeyValidator(
    'allowanonymous',
    caseInsensitivePermissions,
    new BooleanValue({required: true})
  );
  if (!requiredAllowAnonymous.isValid) {
    throw new InvalidDocument(documentPath, requiredAllowAnonymous.explanation);
  }
  return requiredAllowAnonymous.value!;
};

const validatePermission = (
  permissionLogic: Lowercase<PermissionSection>,
  caseInsensitivePermissions: CaseInsensitiveDocument<PrimitivesValues>,
  documentPath: PathLike
) => {
  const requiredPermission = new RequiredKeyValidator(
    permissionLogic,
    caseInsensitivePermissions,
    getSecurityIdentitySchemaValidation()
  );

  if (!requiredPermission.isValid) {
    throw new InvalidDocument(documentPath, requiredPermission.explanation);
  }

  return requiredPermission.value;
};

const validateRequiredPermissionSetKeysAndGetPermissionSetBuilder = (
  permission: Recordable<PermissionSet>,
  documentPath: PathLike
): PermissionSetBuilder => {
  const caseInsensitivePermissions = new CaseInsensitiveDocument(permission);
  const allowAnonymous = validateAllowAnonymous(
    caseInsensitivePermissions,
    documentPath
  );
  const allowedPermissions = validatePermission(
    'allowedpermissions',
    caseInsensitivePermissions,
    documentPath
  );
  const deniedPermissions = validatePermission(
    'deniedpermissions',
    caseInsensitivePermissions,
    documentPath
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
};

const getIdentityTypeRegex = () => {
  const identityTypesValues = Object.values(PermissionIdentityType);
  return new RegExp(identityTypesValues.join('|'), 'i');
};

const getSecurityIdentitySchemaValidation = (): ArrayValue<Permission> => {
  return new ArrayValue({
    required: false,
    each: new RecordValue({
      values: {
        identity: new StringValue({required: true, emptyAllowed: false}),
        identityType: new StringValue({
          regex: getIdentityTypeRegex(),
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
};

const ensurePermissionArray = (
  caseInsensitiveDoc: CaseInsensitiveDocument<PrimitivesValues>,
  documentPath: PathLike
) => {
  const validator = (schema: ArrayValue<PrimitivesValues>) =>
    new RequiredKeyValidator('permissions', caseInsensitiveDoc, schema);
  const requiredPermissionArray = validator(new ArrayValue({required: false}));
  const requiredAtLeastOnePermission = validator(new ArrayValue({min: 1}));

  if (!requiredPermissionArray.isValid) {
    throw new InvalidDocument(
      documentPath,
      requiredPermissionArray.explanation
    );
  }

  if (!requiredAtLeastOnePermission.isValid) {
    // simply discard empty array permission instead of throwing
    delete caseInsensitiveDoc.documentRecord['permissions'];
  }
};
