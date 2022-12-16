import dayjs = require('dayjs');
import {createHash} from 'crypto';
import {CompressionType, Document, Metadata, MetadataValue} from './document';
import {isFieldNameValid} from './fieldAnalyser/fieldUtils';
import {UnsupportedFieldError} from './errors/fieldErrors';
import {
  BuiltInTransformers,
  Transformer,
} from './validation/transformers/transformer';
import {PermissionSetBuilder} from './permissionSetBuilder';
/**
 * Utility class to build a {@link Document}.
 */
export class DocumentBuilder {
  private doc: Document;
  /**
   *
   * @param uri The URI of the document. See {@link Document.uri}
   * @param title The title of the document. See {@link Document.title}
   */
  constructor(private uri: string, title: string) {
    this.doc = {
      uri,
      title,
      metadata: {},
      permissions: [], // TODO: CDX-1282 Prevent pushing empty permission arrays
    };
  }

  /**
   * Set the data of the document. See {@link Document.data}
   * @param data
   * @returns
   */
  public withData(data: string) {
    this.doc.data = data;
    return this;
  }

  /**
   * Set the date of the document. See {@link Document.date}
   * @param date
   * @returns
   */
  public withDate(date: Date | string | number) {
    this.doc.date = this.validateDateAndReturnValidDate(date);
    return this;
  }

  /**
   * Set the modified date of the document. See {@link Document.modifiedDate}
   * @param date
   * @returns
   */
  public withModifiedDate(date: Date | string | number) {
    this.doc.modifiedDate = this.validateDateAndReturnValidDate(date);
    return this;
  }

  /**
   * Set the permanentID of the document. See {@link Document.permanentId}
   * @param permanentID
   * @returns
   */
  public withPermanentId(permanentID: string) {
    this.doc.permanentId = permanentID;
    return this;
  }

  /**
   * Set the base64 encoded, compressed binary data of the document. See {@link Document.compressedBinaryData}
   * @param data
   * @param compressionType
   * @returns
   */
  public withCompressedBinaryData(
    data: string,
    compressionType: CompressionType
  ) {
    this.validateCompressedBinaryData(data);
    this.doc.compressedBinaryData = {
      data,
      compressionType,
    };
    return this;
  }

  /**
   * Set the file extension on the document. See {@link Document.fileExtension}
   * @param extension
   * @returns
   */
  public withFileExtension(extension: string) {
    if (extension[0] !== '.') {
      throw `Extension ${extension} should start with a leading .`;
    }
    this.doc.fileExtension = extension;
    return this;
  }

  /**
   * Set the parentID on the document. See {@link Document.parentId}
   * @param id
   * @returns
   */
  public withParentID(id: string) {
    this.doc.parentId = id;
    return this;
  }

  /**
   * Set the clickableURI on the document. See {@link Document.clickableUri}
   * @param clickURI
   * @returns
   */
  public withClickableUri(clickURI: string) {
    // TODO: Validate that it's a valid link/proper scheme... ?
    // Unsure
    this.doc.clickableUri = clickURI;
    return this;
  }

  /**
   * Set the author on the document. See {@link Document.author}
   * @param author
   * @returns
   */
  public withAuthor(author: string) {
    this.doc.author = author;
    return this;
  }

  /**
   * Add a single metadata key and value pair on the document. See {@link Document.metadata}
   * @param {string} key
   * @param {MetadataValue} value
   * @param {Transformer} [metadataKeyTransformer=BuiltInTransformers.identity] The {@link Transformer} to apply to the metadata key.
   * If not specified, no transformation will be applied to the metadata key.
   *
   * For a list of built-in transformers, use {@link BuiltInTransformers}.
   * @returns
   */
  public withMetadataValue(
    key: string,
    value: MetadataValue,
    keyTransformer: Transformer = BuiltInTransformers.identity
  ) {
    const transformedKey = keyTransformer(key);
    const reservedKeyNames = [
      'compressedBinaryData',
      'compressedBinaryDataFileId',
      'parentId',
      'fileExtension',
      'data',
      'permissions',
      'documentId',
      'orderingId',
    ];
    if (
      reservedKeyNames.some(
        (reservedKey) =>
          reservedKey.toLowerCase() === transformedKey.toLowerCase()
      )
    ) {
      throw `Cannot use ${transformedKey} as a metadata key: It is a reserved key name. See https://docs.coveo.com/en/78/index-content/push-api-reference#json-document-reserved-key-names`;
    }
    if (!isFieldNameValid(transformedKey)) {
      throw new UnsupportedFieldError([key, transformedKey]);
    }

    this.doc.metadata![transformedKey] = value;
    return this;
  }

  /**
   * Set metadata on the document. See {@link Document.metadata}
   * @param {Metadata} metadata
   * @param {Transformer} [metadataKeyTransformer=BuiltInTransformers.identity] The {@link Transformer} to apply to all the document metadata keys.
   * If not specified, no transformation will be applied to the metadata keys.
   *
   * For a list of built-in transformers, use {@link BuiltInTransformers}.
   * @returns
   */
  public withMetadata(
    metadata: Metadata,
    metadataKeyTransformer: Transformer = BuiltInTransformers.identity
  ) {
    const invalidKeys: [string, string][] = [];

    for (const [k, v] of Object.entries(metadata)) {
      try {
        this.withMetadataValue(k, v, metadataKeyTransformer);
      } catch (error) {
        if (error instanceof UnsupportedFieldError) {
          invalidKeys.push(...error.unsupportedFields);
        } else {
          throw error;
        }
      }
    }

    if (invalidKeys.length > 0) {
      throw new UnsupportedFieldError(...invalidKeys);
    }
    return this;
  }

  /**
   * Set a permission set on the document
   * Multiple permission sets can be combined.
   *
   * See [Simple Permission Model Definition Examples](https://docs.coveo.com/en/107)
   */
  public withPermissionSet(permissionSetBuilder: PermissionSetBuilder) {
    this.doc.permissions?.push(permissionSetBuilder.build());
    return this;
  }

  /**
   * Set a permission level on the document
   * Multiple permission levels can be added to the document. In this case, the order at which this method is called will influence the permission hierarchy.
   *
   * Consider the following example:
   * ```
   *  doc.withPermissionLevel('level1', [setA])
   *     .withPermissionLevel('level2', [setB, setC])
   * ```
   *
   * Permission sets from level1 (`setA`) will supersed the ones from level2 (`setB` and `setC`).
   *
   * See [Complex Permission Model Definition](https://docs.coveo.com/en/25/index-content/complex-permission-model-definition-example)
   */
  public withPermissionLevel(
    permissionLevelName: string,
    permissionSetBuilders: PermissionSetBuilder[]
  ) {
    const permissionSets = permissionSetBuilders.map((permissionSet) =>
      permissionSet.build()
    );
    this.doc.permissions?.push({
      name: permissionLevelName,
      permissionSets,
    });

    return this;
  }

  public build() {
    return this.doc;
  }

  /**
   * Marshal the document into a JSON format accepted by the push API.
   * @returns
   */
  public marshal() {
    this.validateAndFillMissing();
    const {uri, metadata, permissions, ...omitSomeProperties} = this.doc;
    const out = {
      ...omitSomeProperties,
      ...this.marshalMetadata(),
      ...this.marshalCompressedBinaryData(),
      ...this.marshalPermissions(),
      documentId: uri,
    };
    return out;
  }

  private marshalMetadata() {
    if (!this.doc.metadata) {
      return {};
    }
    const out: Metadata = {};
    for (const [k, v] of Object.entries(this.doc.metadata)) {
      out[k] = v;
    }
    return out;
  }

  private marshalCompressedBinaryData() {
    if (!this.doc.compressedBinaryData) {
      return {};
    }
    return {
      compressedBinaryData: this.doc.compressedBinaryData.data,
      compressionType: this.doc.compressedBinaryData.compressionType,
    };
  }

  private marshalPermissions() {
    return {permissions: this.doc.permissions || []};
  }

  private validateAndFillMissing() {
    // TODO: validation that cannot be performed on a single property, but requires looking at multiple property at the same time.
    // or validate that we don't have both `data` AND `compressedBinaryData`.
    // Could also use https://www.npmjs.com/package/@coveo/bueno to validate schema (useful for pure JS users).
    if (!this.doc.permanentId) {
      this.doc.permanentId = this.generatePermanentId();
    }
    return;
  }

  private generatePermanentId() {
    const md5: string = createHash('md5').update(this.doc.uri).digest('hex');
    const sha1: string = createHash('sha1').update(this.doc.uri).digest('hex');
    return md5.substring(0, 30) + sha1.substring(0, 30);
  }

  private validateDateAndReturnValidDate(d: Date | string | number) {
    const validatedDate = dayjs(d);
    return validatedDate.toISOString();
  }

  private validateCompressedBinaryData(data: string) {
    const isBase64 = Buffer.from(data, 'base64').toString('base64') === data;
    if (!isBase64) {
      throw 'Invalid compressedBinaryData: When using compressedBinaryData, the data must be base64 encoded.';
    }
  }
}
