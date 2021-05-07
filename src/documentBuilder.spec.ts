import {DocumentBuilder} from './documentBuilder';

describe('DocumentBuilder', () => {
  let docBuilder: DocumentBuilder;
  beforeEach(() => {
    docBuilder = new DocumentBuilder('uri', 'title');
  });

  it('should marshal title', () => {
    expect(docBuilder.marshal().title).toBe('title');
  });

  it('should not marshal uri', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((docBuilder.marshal() as any).uri).toBeUndefined();
  });

  it('should marshal data', () => {
    expect(docBuilder.withData('foo').marshal().data).toBe('foo');
  });

  it('should marshal date', () => {
    const d = new Date();
    expect(docBuilder.withDate(d).marshal().date).toMatch(d.toISOString());
  });

  it('should marshal author', () => {
    expect(docBuilder.withAuthor('bob').marshal().author).toBe('bob');
  });

  it('should marshal clickableUri', () => {
    expect(docBuilder.withClickableUri('click').marshal().clickableUri).toBe(
      'click'
    );
  });

  it('should marshal fileExtension', () => {
    expect(docBuilder.withFileExtension('.html').marshal().fileExtension).toBe(
      '.html'
    );
  });

  it('should marshal metadata', () => {
    expect(
      docBuilder.withMetadata({foo: 'bar', buzz: ['bazz', 'bozz']}).marshal()
    ).toMatchObject({foo: 'bar', buzz: ['bazz', 'bozz']});
  });

  it('should marshal single metadata value', () => {
    expect(docBuilder.withMetadataValue('foo', 'bar').marshal()).toMatchObject({
      foo: 'bar',
    });
  });

  it('should not marshal metadata key', () => {
    expect(
      (docBuilder
        .withMetadata({foo: 'bar', buzz: ['bazz', 'bozz']})
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .marshal() as any).metadata
    ).toBeUndefined();
  });

  it('should marshal modifiedDate', () => {
    const d = new Date();
    expect(docBuilder.withModifiedDate(d).marshal().modifiedDate).toMatch(
      d.toISOString()
    );
  });

  it('should marshal parentId', () => {
    expect(docBuilder.withParentID('id').marshal().parentId).toBe('id');
  });

  it('should marshal permanentId', () => {
    expect(docBuilder.withPermanentId('id').marshal().permanentId).toBe('id');
  });

  it('throws when adding a reserved key name metadata', () => {
    const theseShouldThrow = [
      'compressedBinaryData',
      'compressedBinaryDataFileId',
      'parentId',
      'fileExtension',
      'data',
      'permissions',
      'documentId',
      'orderingId',
    ];

    for (const shouldThrow of theseShouldThrow) {
      expect(() => docBuilder.withMetadataValue(shouldThrow, 'foo')).toThrow();
    }
  });
});
