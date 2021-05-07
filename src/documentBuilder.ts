import dayjs = require('dayjs');
import {createHash} from 'crypto';
import {CompressionType, Document, Metadata, MetadataValue} from './document';
import {SecurityIdentityBuilder} from './securityIdentityBuilder';

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
      permissions: {allowAnonymous: false},
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
    //TODO: Validate valid file extension
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
   * @param key
   * @param value
   * @returns
   */
  public withMetadataValue(key: string, value: MetadataValue) {
    // TODO: validate reserved names
    this.doc.metadata![key] = value;
    return this;
  }

  /**
   * Set metadata on the document. See {@link Document.metadata}
   * @param metadata
   * @returns
   */
  public withMetadata(metadata: Metadata) {
    for (const [k, v] of Object.entries(metadata)) {
      this.withMetadataValue(k, v);
    }
    return this;
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
   * Set allowAnonymous for permissions on the document. See {@link Document.permissions}
   * @param allowAnonymous
   * @returns
   */
  public withAnonymousUsers(allowAnonymous: boolean) {
    this.doc.permissions!.allowAnonymous = allowAnonymous;
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
    const out = {
      ...this.doc,
      ...this.marshalMetadata(),
      ...this.marshalCompressedBinaryData(),
      ...this.marshalPermissions(),
    };
    delete out.metadata;
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
    if (!this.doc.permissions) {
      return '';
    }
    return {
      allowAnonymous: this.doc.permissions.allowAnonymous,
      allowedPermissions: this.doc.permissions.allowedPermissions?.map((p) =>
        JSON.stringify(p)
      ),
      deniedPermissions: this.doc.permissions.deniedPermissions?.map((p) =>
        JSON.stringify(p)
      ),
    };
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
    return createHash('sha256').update(this.doc.uri).digest('hex');
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

  private setPermission(
    securityIdentityBuilder: SecurityIdentityBuilder,
    permissionSection: 'allowedPermissions' | 'deniedPermissions'
  ) {
    const identities = securityIdentityBuilder.build();
    if (Array.isArray(identities)) {
      this.doc.permissions![permissionSection] = identities;
    } else {
      this.doc.permissions![permissionSection] = [identities];
    }
  }
}
