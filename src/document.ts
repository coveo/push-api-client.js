import {PermissionLevel, PermissionSet} from '@coveo/platform-client';

type BaseMetadataValue = string | string[] | number | number[] | boolean;
type DictionaryMetadataValue = Record<string, BaseMetadataValue>;
export type MetadataValue = BaseMetadataValue | DictionaryMetadataValue;
export type Metadata = Record<string, MetadataValue>;

export enum CompressionTypeEnum {
  Uncompressed = 'UNCOMPRESSED',
  Deflate = 'DEFLATE',
  Gzip = 'GZIP',
  Lzma = 'LZMA',
  Zlib = 'ZLIB',
}

/**
 * The compression type that was applied to your compressed document.
 */
export type CompressionType = Uppercase<keyof typeof CompressionTypeEnum>;

/**
 * A Coveo document.
 */
export interface Document {
  /**
   * The Uniform Resource Identifier (URI) that uniquely identifies the document in a Coveo index.
   *
   * Examples:
   * - `http://www.example.com/`
   * - `file://folder/text.txt`
   */
  uri: string;
  /**
   * The title of the document.
   */
  title: string;
  /**
   * The clickable URI associated with the document.
   */
  clickableUri?: string;
  /**
   * The author of the document.
   */
  author?: string;
  /**
   * The date of the document, represented as an ISO string.
   *
   * Optional, will default to indexation date.
   */
  date?: string;
  /**
   * The modified date of the document, represented as an ISO string.
   *
   * Optional, will default to indexation date.
   */
  modifiedDate?: string;
  /**
   * The permanent identifier of a document that does not change over time.
   *
   * Optional, will be derived from the document URI.
   */
  permanentId?: string;
  /**
   * The unique identifier (URI) of the parent item.
   *
   * Specifying a value for this key creates a relationship between the attachment item (child) and its parent item.
   *
   * This value also ensures that a parent and all of its attachments will be routed in the same index slice.
   */
  parentId?: string;
  /**
   * The textual (non-binary) content of the item.
   *
   * Whenever you're pushing a compressed binary item (such as XML/HTML, PDF, Word, or binary), you should use the CompressedBinaryData or CompressedBinaryDataFileId attribute instead, depending on the content size.
   *
   * Accepts 5 MB or less of uncompressed textual data.
   *
   * See https://docs.coveo.com/en/73 for more information.
   *
   * Example: `This is a simple string that will be used for searchability as well as to generate excerpt and summaries for the document.`
   */
  data?: string;
  /**
   * The original binary item content, compressed using one of the supported compression types (Deflate, GZip, LZMA, Uncompressed, or ZLib), and then Base64 encoded.
   *
   * You can use this parameter when you're pushing a compressed binary item (such as XML/HTML, PDF, Word, or binary) whose size is less than 5 MB.
   *
   * Whenever you're pushing an item whose size is 5 MB or more, use the CompressedBinaryDataFileIdproperty instead.
   *
   * If you're pushing less than 5 MB of textual (non-binary) content, you can use the data property instead.
   *
   * See https://docs.coveo.com/en/73 for more information.
   */
  compressedBinaryData?: {
    /**
     * The compression type that was applied to your document.
     */
    compressionType: CompressionType;
    /**
     * The base64 encoded binary data.
     *
     * Example: `eJxzrUjMLchJBQAK4ALN`
     */
    data: string;
  };
  /**
   * The metadata key-value pairs for a given document.
   *
   * Each metadata in the document must be unique.
   *
   * Metadata are case-insensitive (e.g., the Push API considers mykey, MyKey, myKey, MYKEY, etc. as identical).
   *
   * See https://docs.coveo.com/en/115 for more information.
   */
  metadata?: Metadata;
  /**
   * The list of permission sets for this item.
   *
   * This is useful when item based security is required (i.e., when security isn't configured at the source level).
   *
   * See https://docs.coveo.com/en/107 for more information.
   */
  permissions?: Array<PermissionSet | PermissionLevel>;
  /**
   * The file extension of the data you're pushing.
   *
   * This is useful when pushing a compressed item. The converter uses this information to identify how to correctly process the item.
   *
   * Values must include the preceding . character.
   *
   * Example: `.html`
   */
  fileExtension?: string;
}
