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
import {Metadata} from '../document';
import {ParseDocumentOptions} from '../interfaces';

export const parseAndGetDocumentBuilderFromJSONDocument = (
  documentPath: PathLike,
  options?: ParseDocumentOptions
): DocumentBuilder[] => {
  ensureFileIntegrity(documentPath);

  const fileContent = safeJSONParse(documentPath);

  const executeCallback = (docBuilder: DocumentBuilder) => {
    if (options?.callback) {
      options?.callback(docBuilder, documentPath);
    }
  };

  if (Array.isArray(fileContent)) {
    return fileContent.map((doc) => {
      const docBuilder = processDocument(doc, documentPath, options);
      executeCallback(docBuilder);
      return docBuilder;
    });
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
    processSecurityIdentities(
      caseInsensitiveDoc,
      documentBuilder,
      documentPath
    );
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

const processSecurityIdentities = (
  caseInsensitiveDoc: CaseInsensitiveDocument<PrimitivesValues>,
  documentBuilder: DocumentBuilder,
  documentPath: PathLike
) => {
  new KnownKeys<Document['permissions']>(
    'permissions',
    caseInsensitiveDoc
  ).whenExists((permissions) => {
    const caseInsensitivePermissions = new CaseInsensitiveDocument(
      permissions!
    );
    const requiredAllowAnonymous = new RequiredKeyValidator(
      'allowanonymous',
      caseInsensitivePermissions,
      new BooleanValue({required: true})
    );
    if (!requiredAllowAnonymous.isValid) {
      throw new InvalidDocument(
        documentPath,
        requiredAllowAnonymous.explanation
      );
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

    documentBuilder.withAllowAnonymousUsers(permissions!.allowAnonymous);
    permissions?.allowedPermissions?.forEach((p) => {
      documentBuilder.withAllowedPermissions(
        new AnySecurityIdentityBuilder(
          p.identityType,
          p.identity,
          p.securityProvider
        )
      );
    });
    permissions?.deniedPermissions?.forEach((p) => {
      documentBuilder.withDeniedPermissions(
        new AnySecurityIdentityBuilder(
          p.identityType,
          p.identity,
          p.securityProvider
        )
      );
    });

    delete caseInsensitiveDoc.documentRecord['permissions'];
  });
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
            emptyAllowed: false,
            required: true,
          }),
        },
      }),
    });
  };
