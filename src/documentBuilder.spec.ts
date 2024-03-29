import {DocumentBuilder} from './documentBuilder';
import {PermissionSetBuilder} from './permissionSetBuilder';
import {
  GroupSecurityIdentityBuilder,
  UserSecurityIdentityBuilder,
  VirtualGroupSecurityIdentityBuilder,
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

  it('should uri marshal to documentID (path->uri)', () => {
    expect(docBuilder.marshal().documentId).toMatch(/file:\/\/.*\/uri/);
  });

  it('should uri marshal to documentID (uri->uri)', () => {
    expect(
      new DocumentBuilder('foo://bar.biz', 'aaa').marshal().documentId
    ).toBe('foo://bar.biz');
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
    expect(docBuilder.withPermanentId('id').marshal().permanentid).toBe('id');
  });

  it('should generate permanentid', () => {
    docBuilder = new DocumentBuilder('https://foo.com', 'bar');
    expect(docBuilder.marshal().permanentid).toBe(
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

  it('should build every permission set added to the document', () => {
    const userIdentity = new UserSecurityIdentityBuilder([
      'bob@foo.com',
      'sue@foo.com',
    ]);
    const groupIdentity = new GroupSecurityIdentityBuilder('my_group');
    const bobSpy = jest.spyOn(userIdentity, 'build');
    const groupSpy = jest.spyOn(userIdentity, 'build');

    const permissionSet = new PermissionSetBuilder(false)
      .withDeniedPermissions(userIdentity)
      .withDeniedPermissions(groupIdentity);

    docBuilder.withPermissionSet(permissionSet);

    expect(bobSpy).toHaveBeenCalledTimes(1);
    expect(groupSpy).toHaveBeenCalledTimes(1);
  });

  it('should not marshal an empty array when permissions are not defined', () => {
    expect(docBuilder.marshal()).not.toContain('permissions');
  });

  it('should marshal permission set', () => {
    const userIdentity = new UserSecurityIdentityBuilder([
      'bob@foo.com',
      'sue@foo.com',
    ]);
    const permissionSet = new PermissionSetBuilder(false)
      .withDeniedPermissions(userIdentity)
      .withDeniedPermissions(new GroupSecurityIdentityBuilder('my_group'))
      .withDeniedPermissions(
        new VirtualGroupSecurityIdentityBuilder('virtual_group')
      );

    const {permissions} = docBuilder.withPermissionSet(permissionSet).marshal();
    expect(permissions).toHaveLength(1);
  });

  describe('when combining multiple permission sets', () => {
    // Example taken from https://docs.coveo.com/en/107
    const openedPermissionSet = new PermissionSetBuilder(
      true
    ).withDeniedPermissions(
      new UserSecurityIdentityBuilder('asmith@example.com')
    );

    const restrictedPermissionSet = new PermissionSetBuilder(false)
      .withAllowedPermissions(new GroupSecurityIdentityBuilder('SampleTeam1'))
      .withAllowedPermissions(
        new UserSecurityIdentityBuilder('emitchell@example.com')
      );

    const misteryPermissionSet = new PermissionSetBuilder(false)
      .withDeniedPermissions(
        new VirtualGroupSecurityIdentityBuilder('SampleGroup')
      )
      .withAllowedPermissions(new UserSecurityIdentityBuilder('MysteryUserX'));

    it('should marshal multiple permission sets', () => {
      const {permissions} = docBuilder
        .withPermissionSet(openedPermissionSet)
        .withPermissionSet(restrictedPermissionSet)
        .withPermissionSet(misteryPermissionSet)
        .marshal();
      expect(permissions).toHaveLength(3);
    });

    it('should marshal permission level', () => {
      const {permissions} = docBuilder
        .withPermissionLevel('level1', [
          openedPermissionSet,
          restrictedPermissionSet,
        ])
        .withPermissionLevel('level2', [misteryPermissionSet])
        .marshal();

      expect(permissions).toMatchSnapshot();
    });
  });
});
