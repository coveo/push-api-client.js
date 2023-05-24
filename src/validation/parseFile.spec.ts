import {join} from 'path';
import {cwd} from 'process';
import {parseAndGetDocumentBuilderFromJSONDocument} from './parseFile';
import {InvalidDocument} from '../errors/validatorErrors';
import {readFileSync} from 'fs';

const stripFilePathFromSnapshot = () => {
  const fileJsonFileErrorRegex = new RegExp(
    /^.*?(\w+\.json)(?= is not a valid JSON)/m
  );
  expect.addSnapshotSerializer({
    test: (val: string) => Boolean(val.match(fileJsonFileErrorRegex)),
    print: (val) => `${val}`.replace(fileJsonFileErrorRegex, '$1'),
  });
};

describe('parseFile', () => {
  const pathToStub = join(cwd(), 'src', '__stub__');
  const parse = (file: string) => () =>
    parseAndGetDocumentBuilderFromJSONDocument(file);

  it('should accept non-url documentIDs', async () => {
    const file = join(pathToStub, 'jsondocuments', 'notAnUrl.json');
    await expect(
      parseAndGetDocumentBuilderFromJSONDocument(file)
    ).resolves.not.toThrow();
  });

  it.each([
    {
      title: 'should fail on missing title',
      fileName: 'noTitle.json',
      error: 'title: value is required.',
    },
    {
      title: 'should fail on missing documentID',
      fileName: 'noID.json',
      error: 'documentid: value is required.',
    },
    {
      title: 'should fail on missing identity',
      fileName: 'noIdentity.json',
      error: 'allowedpermissions:  value does not contain identity',
    },
    {
      title: 'should fail on identity with an invalid string',
      fileName: 'identityNotAString.json',
      error: 'allowedpermissions:   value is not a string.',
    },
    {
      title: 'should fail on allow anonymous with an invalid boolean',
      fileName: 'identityAllowAnonymousNotABoolean.json',
      error: 'allowanonymous: value is not a boolean.',
    },
    {
      title: 'should fail on identityType with an invalid value',
      fileName: 'identityTypeInvalidValue.json',
      error:
        'allowedpermissions:   value did not match provided regex /Unknown|User|Group|VirtualGroup/i',
    },
    {
      title: 'should fail on permission not being an array',
      fileName: 'notAPermissionArray.json',
      error: 'permissions: value is not an array',
    },
    {
      title: 'should fail on permission not being an array',
      fileName: 'notAPermissionArray.json',
      error: 'permissions: value is not an array',
    },
    {
      title: 'should fail on permission not being an array',
      fileName: 'notAPermissionArray.json',
      error: 'permissions: value is not an array',
    },
    {
      title: 'should fail on permission not being an array',
      fileName: 'notAPermissionArray.json',
      error: 'permissions: value is not an array',
    },
    {
      title: 'should fail on CompressionType not being a supported value',
      fileName: 'notValidCompressedBinaryData.json',
      error:
        'Invalid compressedBinaryData: When using compressedBinaryData, the data must be base64 encoded.',
    },
    {
      title: 'should fail on CompressionType not being a supported value',
      fileName: 'notSupportedCompressionType.json',
      error:
        'compressionType: value is not in enum.\nSupported values are: UNCOMPRESSED, DEFLATE, GZIP, LZMA, ZLIB',
    },
  ])('$title', async ({fileName, error}) => {
    const file = join(pathToStub, 'jsondocuments', fileName);
    await expect(parse(file)).rejects.toThrowError(InvalidDocument);
    await expect(parse(file)).rejects.toThrow(error);
  });

  it('should not throw if allowedPermissions or deniedPermissions are omitted', async () => {
    const file = join(pathToStub, 'jsondocuments', 'limitedPermissionSet.json');
    await expect(
      parseAndGetDocumentBuilderFromJSONDocument(file)
    ).resolves.not.toThrow();
  });

  it('should fail on reserved keyword', async () => {
    const file = join(pathToStub, 'jsondocuments', 'reservedKeyword.json');
    const fileContent = readFileSync(file).toString();
    await expect(parse(file)).rejects.toThrow(
      new InvalidDocument(
        file,
        JSON.parse(fileContent),
        'Cannot use parentid as a metadata key: It is a reserved key name. See https://docs.coveo.com/en/78/index-content/push-api-reference#json-document-reserved-key-names'
      )
    );
  });

  it('should fail on reserved keyword', async () => {
    const file = join(pathToStub, 'jsondocuments', 'brokenBatch.json');
    stripFilePathFromSnapshot();
    await expect(parse(file)).rejects.toThrowErrorMatchingSnapshot();
  });

  it('should fail on unsupported metadata key', async () => {
    const file = join(pathToStub, 'jsondocuments', 'invalidFields.json');
    await expect(parse(file)).rejects.toThrowErrorMatchingSnapshot();
  });
});
