import {
  ArrayValue,
  BooleanValue,
  PrimitivesValues,
  RecordValue,
  StringValue,
} from '@coveo/bueno';
import {
  DocumentBuilder,
  Document,
  SecurityIdentity,
  AnySecurityIdentityBuilder,
  MetadataValue,
} from '..';
import {existsSync, lstatSync, PathLike, readFileSync} from 'fs';
import {CaseInsensitiveDocument} from './caseInsensitiveDocument';
import {KnownKeys} from './knownKey';
import {
  InvalidDocument,
  NotAFileError,
  NotAJsonFileError,
} from '../errors/validatorErrors';
import {RequiredKeyValidator} from './requiredKeyValidator';
import {Metadata, PermissionLevelModel, PermissionSetModel} from '../document';
import {ParseDocumentOptions} from '../interfaces';
import {PermissionSetBuilder} from '../permissionSetBuilder';

export const parseAndGetDocumentBuilderFromJSONDocument = async (
  documentPath: PathLike,
  options?: ParseDocumentOptions
): Promise<DocumentBuilder[]> => {
  ensureFileIntegrity(documentPath);

  const fileContent = safeJSONParse(documentPath);

  const executeCallback = async (docBuilder: DocumentBuilder) => {
    if (options?.callback) {
      await options?.callback(docBuilder, documentPath);
    }
  };

  if (Array.isArray(fileContent)) {
    const docBuilders: DocumentBuilder[] = [];
    for (const doc of fileContent) {
      const docBuilder = processDocument(doc, documentPath, options);
      await executeCallback(docBuilder);
      docBuilders.push(docBuilder);
    }
    return docBuilders;
  } else {
    const docBuilder = processDocument(fileContent, documentPath, options);
    executeCallback(docBuilder);
    return [docBuilder];
  }
};

const safeJSONParse = (documentPath: PathLike) => {
  const fileContent = readFileSync(documentPath).toString();
  try {
    return JSON.parse(fileContent) as
      | Record<string, string>
      | Record<string, string>[];
  } catch (error) {
    throw new NotAJsonFileError(documentPath);
  }
};

const processDocument = (
  fileContent: Record<string, PrimitivesValues>,
  documentPath: PathLike,
  options?: ParseDocumentOptions
) => {
  const caseInsensitiveDoc = new CaseInsensitiveDocument(fileContent);

  const documentBuilder = validateRequiredKeysAndGetDocumentBuilder(
    caseInsensitiveDoc,
    documentPath
  );
  try {
    processKnownKeys(caseInsensitiveDoc, documentBuilder);
    processPermissionList(caseInsensitiveDoc, documentBuilder, documentPath);
    processMetadata(caseInsensitiveDoc, documentBuilder, options);
  } catch (error) {
    if (typeof error === 'string') {
      throw new InvalidDocument(documentPath, error);
    }
    throw error;
  }
  return documentBuilder;
};

const validateRequiredKeysAndGetDocumentBuilder = (
  caseInsensitiveDoc: CaseInsensitiveDocument<PrimitivesValues>,
  documentPath: PathLike
) => {
  const requiredDocumentId = new RequiredKeyValidator<string>(
    ['documentid', 'uri'],
    caseInsensitiveDoc,
    new StringValue({required: true, emptyAllowed: false})
  );

  if (!requiredDocumentId.isValid) {
    throw new InvalidDocument(documentPath, requiredDocumentId.explanation);
  }

  const requiredDocumentTitle = new RequiredKeyValidator<string>(
    'title',
    caseInsensitiveDoc,
    new StringValue({required: true, emptyAllowed: false})
  );
  if (!requiredDocumentTitle.isValid) {
    throw new InvalidDocument(documentPath, requiredDocumentTitle.explanation);
  }

  delete caseInsensitiveDoc.documentRecord['documentid'];
  delete caseInsensitiveDoc.documentRecord['uri'];
  delete caseInsensitiveDoc.documentRecord['title'];

  return new DocumentBuilder(
    requiredDocumentId.value!,
    requiredDocumentTitle.value!
  );
};

const processKnownKeys = (
  caseInsensitiveDoc: CaseInsensitiveDocument<PrimitivesValues>,
  documentBuilder: DocumentBuilder
) => {
  new KnownKeys<string>('author', caseInsensitiveDoc).whenExists((author) => {
    documentBuilder.withAuthor(author);
    delete caseInsensitiveDoc.documentRecord['author'];
  });
  new KnownKeys<string>('clickableuri', caseInsensitiveDoc).whenExists(
    (clickuri) => {
      documentBuilder.withClickableUri(clickuri);
      delete caseInsensitiveDoc.documentRecord['clickableuri'];
    }
  );
  new KnownKeys<string>('data', caseInsensitiveDoc).whenExists((data) => {
    documentBuilder.withData(data);
    delete caseInsensitiveDoc.documentRecord['data'];
  });
  new KnownKeys<string>('date', caseInsensitiveDoc).whenExists((date) => {
    documentBuilder.withDate(date);
    delete caseInsensitiveDoc.documentRecord['date'];
  });
  new KnownKeys<string>('modifieddate', caseInsensitiveDoc).whenExists(
    (modifiedDate) => {
      documentBuilder.withModifiedDate(modifiedDate);
      delete caseInsensitiveDoc.documentRecord['modifieddate'];
    }
  );
  new KnownKeys<string>('fileextension', caseInsensitiveDoc).whenExists(
    (fileExtension) => {
      documentBuilder.withFileExtension(fileExtension);
      delete caseInsensitiveDoc.documentRecord['fileextension'];
    }
  );
  new KnownKeys<string>('permanentid', caseInsensitiveDoc).whenExists(
    (permanentId) => {
      documentBuilder.withPermanentId(permanentId);
      delete caseInsensitiveDoc.documentRecord['permanentid'];
    }
  );
};

const ensurePermissionArray = (
  caseInsensitiveDoc: CaseInsensitiveDocument<PrimitivesValues>,
  documentPath: PathLike
) => {
  const requiredPermissionArray = new RequiredKeyValidator(
    'permissions',
    caseInsensitiveDoc,
    new ArrayValue({required: false})
  );
  if (!requiredPermissionArray.isValid) {
    throw new InvalidDocument(
      documentPath,
      requiredPermissionArray.explanation
    );
  }
};

// TODO: test with simple permissions
// TODO: test with complext permissions
// TODO: check if can provide both complex and simple permission within the array
const processPermissionList = (
  caseInsensitiveDoc: CaseInsensitiveDocument<PrimitivesValues>,
  documentBuilder: DocumentBuilder,
  documentPath: PathLike
) => {
  ensurePermissionArray(caseInsensitiveDoc, documentPath);
  new KnownKeys<Document['permissions']>(
    'permissions',
    caseInsensitiveDoc
  ).whenExists((permissions) => {
    permissions!.forEach((permission) => {
      const caseInsensitivePermission =
        new CaseInsensitiveDocument<PrimitivesValues>(permission);

      new KnownKeys('permissionsets', caseInsensitivePermission)
        .whenExists<PermissionLevelModel>((permissionLevel) =>
          processPermissionLevel(permissionLevel, documentBuilder, documentPath)
        )
        .whenDoesNotExist<PermissionSetModel>((permissionSet) =>
          processPermissionSet(permissionSet, documentBuilder, documentPath)
        );
    });

    delete caseInsensitiveDoc.documentRecord['permissions'];
  });
};

const processPermissionSet = (
  permissionSet: PermissionSetModel,
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
  permission: PermissionLevelModel,
  documentBuilder: DocumentBuilder,
  documentPath: PathLike
) => {
  const permissionSetBuilders = permission.permissionSets.map(
    (permissionSet) => {
      // TODO: test with nameless permission level
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

  documentBuilder.withPermissionLevel(permission.name, permissionSetBuilders);
};

const validateRequiredPermissionSetKeysAndGetPermissionSetBuilder = (
  permission: PermissionSetModel,
  documentPath: PathLike
): PermissionSetBuilder => {
  const caseInsensitivePermissions = new CaseInsensitiveDocument(permission);
  const requiredAllowAnonymous = new RequiredKeyValidator(
    'allowanonymous',
    caseInsensitivePermissions,
    new BooleanValue({required: true})
  );
  if (!requiredAllowAnonymous.isValid) {
    throw new InvalidDocument(documentPath, requiredAllowAnonymous.explanation);
  }

  const requiredAllowedPermissions = new RequiredKeyValidator(
    'allowedpermissions',
    caseInsensitivePermissions,
    getSecurityIdentitySchemaValidation()
  );

  if (!requiredAllowedPermissions.isValid) {
    throw new InvalidDocument(
      documentPath,
      requiredAllowedPermissions.explanation
    );
  }

  const requiredDeniedPermissions = new RequiredKeyValidator(
    'deniedpermissions',
    caseInsensitivePermissions,
    getSecurityIdentitySchemaValidation()
  );

  if (!requiredDeniedPermissions.isValid) {
    throw new InvalidDocument(
      documentPath,
      requiredDeniedPermissions.explanation
    );
  }

  const permissionSetBuilder = new PermissionSetBuilder(
    permission.allowAnonymous
  );

  permission.allowedPermissions?.forEach((p) => {
    permissionSetBuilder.withAllowedPermissions(
      new AnySecurityIdentityBuilder(
        p.identityType,
        p.identity,
        p.securityProvider
      )
    );
  });

  permission.deniedPermissions?.forEach((p) => {
    permissionSetBuilder.withDeniedPermissions(
      new AnySecurityIdentityBuilder(
        p.identityType,
        p.identity,
        p.securityProvider
      )
    );
  });

  return permissionSetBuilder;
};

const processMetadata = (
  caseInsensitiveDoc: CaseInsensitiveDocument<PrimitivesValues>,
  documentBuilder: DocumentBuilder,
  options?: ParseDocumentOptions
) => {
  const metadata: Metadata = {};
  Object.entries(caseInsensitiveDoc.documentRecord).forEach(([k, v]) => {
    metadata[k] = v! as Extract<PrimitivesValues, MetadataValue>;
  });
  documentBuilder.withMetadata(metadata, options?.fieldNameTransformer);
};

const ensureFileIntegrity = (documentPath: PathLike) => {
  if (!isFile(documentPath)) {
    throw new NotAFileError(documentPath);
  }
};

const isFile = (p: PathLike) => {
  if (!existsSync(p)) {
    return false;
  }
  return lstatSync(p).isFile();
};

const getSecurityIdentitySchemaValidation =
  (): ArrayValue<SecurityIdentity> => {
    return new ArrayValue({
      required: true,
      each: new RecordValue({
        values: {
          identity: new StringValue({required: true, emptyAllowed: false}),
          identityType: new StringValue({
            constrainTo: ['UNKNOWN', 'USER', 'GROUP', 'VIRTUAL_GROUP'],
            required: true,
            emptyAllowed: false,
          }),
          securityProvider: new StringValue({
            emptyAllowed: true,
            // TODO: not sure this is really required
            required: false,
          }),
        },
      }),
    });
  };
