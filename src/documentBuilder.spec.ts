import {PermissionSetModel} from './document';
import {DocumentBuilder} from './documentBuilder';
import {PermissionSetBuilder} from './permissionSetBuilder';
import {
  GroupSecurityIdentityBuilder,
  UserSecurityIdentityBuilder,
} from './securityIdentityBuilder';
import {BuiltInTransformers} from './validation/transformers/transformer';

describe('DocumentBuilder', () => {
  let docBuilder: DocumentBuilder;
  beforeEach(() => {
    docBuilder = new DocumentBuilder('uri', 'title');
  });

  it('should marshal title', () => {
    expect(docBuilder.marshal().title).toBe('title');
  });

  it('should marshal uri to documentId', () => {
    expect(docBuilder.marshal().documentId).toBe('uri');
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
      docBuilder
        .withMetadata({
          foo: 'bar',
          buzz: ['bazz', 'bozz'],
          baz: {'': 'defaultValue', key1: 'value1'},
        })
        .marshal()
    ).toMatchObject({
      foo: 'bar',
      buzz: ['bazz', 'bozz'],
      baz: {'': 'defaultValue', key1: 'value1'},
    });
  });

  it('should throw error for invalid single metadata value', () => {
    expect(() => {
      docBuilder.withMetadataValue('f-o=o', 'bar').marshal();
    }).toThrowError('f-o=o');
  });

  it('should throw error for invalid metadata values', () => {
    expect(() => {
      docBuilder
        .withMetadata({'f-o=o': 'bar', '<buzz>': ['bazz', 'bozz']})
        .marshal();
    }).toThrowErrorMatchingSnapshot();
  });

  it('should throw error for invalid metadata values even after transformation', () => {
    const poorTransformer = (text: string) => text.replace(/[\W_]+/g, '*');
    expect(() => {
      docBuilder
        .withMetadata(
          {'f-o=o': 'bar', '<buzz>': ['bazz', 'bozz']},
          poorTransformer
        )
        .marshal();
    }).toThrowErrorMatchingSnapshot();
  });

  describe.each([
    {
      title: 'default',
      transformer: BuiltInTransformers.toLowerCase,
      expectedKey: 'foo',
    },
    {
      title: 'underscore',
      transformer: BuiltInTransformers.toSnakeCase,
      expectedKey: 'f_o_o',
    },
  ])('when using the $title transformer', ({transformer, expectedKey}) => {
    it(`should format to ${expectedKey}`, () => {
      expect(
        new DocumentBuilder('uri', 'title')
          .withMetadataValue('f-o=o', 'bar', transformer)
          .marshal()
      ).toMatchObject({
        [expectedKey]: 'bar',
      });
    });
  });

  it('should marshal single metadata value', () => {
    expect(docBuilder.withMetadataValue('foo', 'bar').marshal()).toMatchObject({
      foo: 'bar',
    });
  });

  it('should not marshal metadata key', () => {
    expect(
      (
        docBuilder
          .withMetadata({foo: 'bar', buzz: ['bazz', 'bozz']})
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .marshal() as any
      ).metadata
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

  it('should generate permanentid', () => {
    docBuilder = new DocumentBuilder('https://foo.com', 'bar');
    expect(docBuilder.marshal().permanentId).toBe(
      'aa2e0510b66edff7f05e2b30d4f1b3a4b5481c06b69f41751c54675c5afb'
    );
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

  it('should validate file extension', () => {
    expect(() => docBuilder.withFileExtension('nope')).toThrow();
  });

  // TODO: describe permission sets

  it('should marshal allowedPermissions', () => {
    const permissionSet = new PermissionSetBuilder(
      false
    ).withAllowedPermissions(new UserSecurityIdentityBuilder('bob@foo.com'));

    expect(
      docBuilder.withPermissionSet(permissionSet).marshal().permissions[0]
    ).toMatchObject({
      allowedPermissions: expect.arrayContaining([
        expect.objectContaining({identity: 'bob@foo.com'}),
      ]),
    });
  });

  it('should marshal allowedPermissions in multiple #withAllowedPermissions', () => {
    const permissionSet = new PermissionSetBuilder(false)
      .withAllowedPermissions(new UserSecurityIdentityBuilder('bob@foo.com'))
      .withAllowedPermissions(new GroupSecurityIdentityBuilder('my_group'));

    expect(
      docBuilder.withPermissionSet(permissionSet).marshal().permissions[0]
    ).toMatchObject({
      allowedPermissions: expect.arrayContaining([
        expect.objectContaining({
          identity: 'bob@foo.com',
          identityType: 'USER',
        }),
        expect.objectContaining({
          identity: 'my_group',
          identityType: 'GROUP',
        }),
      ]),
    });
  });

  it('should marshal multiple allowedPermissions', () => {
    const permissionSet = new PermissionSetBuilder(
      false
    ).withAllowedPermissions(
      new UserSecurityIdentityBuilder(['bob@foo.com', 'sue@foo.com'])
    );

    expect(
      docBuilder.withPermissionSet(permissionSet).marshal().permissions[0]
    ).toMatchObject({
      allowedPermissions: expect.arrayContaining([
        expect.objectContaining({identity: 'bob@foo.com'}),
        expect.objectContaining({identity: 'sue@foo.com'}),
      ]),
    });
  });

  it('should marshal deniedPermissions', () => {
    const permissionSet = new PermissionSetBuilder(false).withDeniedPermissions(
      new UserSecurityIdentityBuilder('bob@foo.com')
    );

    expect(
      docBuilder.withPermissionSet(permissionSet).marshal().permissions[0]
    ).toMatchObject({
      deniedPermissions: expect.arrayContaining([
        expect.objectContaining({identity: 'bob@foo.com'}),
      ]),
    });
  });

  it('should marshal deniedPermissions in multiple #withDeniedPermissions', () => {
    const permissionSet = new PermissionSetBuilder(false)
      .withDeniedPermissions(new UserSecurityIdentityBuilder('bob@foo.com'))
      .withDeniedPermissions(new GroupSecurityIdentityBuilder('my_group'));

    expect(
      docBuilder.withPermissionSet(permissionSet).marshal().permissions[0]
    ).toMatchObject({
      deniedPermissions: expect.arrayContaining([
        expect.objectContaining({
          identity: 'bob@foo.com',
          identityType: 'USER',
        }),
        expect.objectContaining({
          identity: 'my_group',
          identityType: 'GROUP',
        }),
      ]),
    });
  });

  it('should marshal multiple deniedPermissions', () => {
    const permissionSet = new PermissionSetBuilder(false).withDeniedPermissions(
      new UserSecurityIdentityBuilder(['bob@foo.com', 'sue@foo.com'])
    );

    expect(
      docBuilder.withPermissionSet(permissionSet).marshal().permissions[0]
    ).toMatchObject({
      deniedPermissions: expect.arrayContaining([
        expect.objectContaining({identity: 'bob@foo.com'}),
        expect.objectContaining({identity: 'sue@foo.com'}),
      ]),
    });
  });

  // it('should marshal allowedPermissions to an empty array when undefined', () => {
  //   const permissionSet = docBuilder.marshal()
  //     .permissions[0] as PermissionSetModel;
  //   expect(permissionSet.allowedPermissions!.length).toBe(0);
  // });

  // it('should marshal deniedPermissions to an empty array when undefined', () => {
  //   const permissionSet = docBuilder.marshal()
  //     .permissions[0] as PermissionSetModel;
  //   expect(permissionSet.deniedPermissions!.length).toBe(0);
  // });
  it('should marshal permissions to an empty array when undefined', () => {
    const permissionSet = docBuilder.marshal().permissions;
    expect(permissionSet).toEqual([]);
  });

  // TODO: test with levels
  // TODO: add sample file with permission levels
});
