import dayjs = require('dayjs');
import {
  CompressionType,
  Document,
  Metadata,
  MetadataValue,
  PermissionIdentity,
} from './document';

/**
 * Utility class that allows to build a {@link Document}
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
      permissions: {allowAnonymous: true},
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
    //TODO: Validate data (length ? base64 ?)
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
   * Set allowed permissions on the document. See {@link Document.permissions}
   * @param permissions
   * @returns
   */
  public withAllowedPermissions(permissions: PermissionIdentity[]) {
    // TODO: Some sort of permission identity builder to make this easier to build
    this.doc.permissions!.allowedPermissions = permissions;
    return this;
  }

  /**
   * Set denied permissions on the document. See {@link Document.permissions}
   * @param permissions
   * @returns
   */
  public withDeniedPermissions(permissions: PermissionIdentity[]) {
    this.doc.permissions!.deniedPermissions = permissions;
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

  /**
   * Marshal the document into a JSON format accepted by the push API.
   * @returns
   */
  public marshal() {
    const validatedDoc = this.validateAndFillMissing();
    return {};
  }

  private validateAndFillMissing() {
    // TODO: validation that cannot be performed on a single property, but requires looking at multiple property at the same time.
    // For example, if there's no permanentID set, we want to generate one using the document URI.
    return this.doc;
  }

  private validateDateAndReturnValidDate(d: Date | string | number) {
    const validatedDate = dayjs(d);
    return validatedDate.toISOString();
  }
}
