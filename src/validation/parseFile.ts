import {PrimitivesValues, StringValue} from '@coveo/bueno';
import {DocumentBuilder, MetadataValue} from '..';
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
import {processPermissionList} from './parsePermissions';

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
