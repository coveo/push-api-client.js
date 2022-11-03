import {join} from 'path';
import {cwd} from 'process';
import {parseAndGetDocumentBuilderFromJSONDocument} from './parseFile';
import {InvalidDocument} from '../errors/validatorErrors';

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
        'allowedpermissions:   value should be one of: UNKNOWN, USER, GROUP, VIRTUAL_GROUP.',
    },
  ])('$title', async ({fileName, error}) => {
    const file = join(pathToStub, 'jsondocuments', fileName);
    await expect(parse(file)).rejects.toThrow(
      new InvalidDocument(
        file,
        `Document contains an invalid value for ${error}`
      )
    );
  });

  it('should fail on reserved keyword', async () => {
    const file = join(pathToStub, 'jsondocuments', 'reservedKeyword.json');
    await expect(parse(file)).rejects.toThrow(
      new InvalidDocument(
        file,
        'Cannot use parentid as a metadata key: It is a reserved key name. See https://docs.coveo.com/en/78/index-content/push-api-reference#json-document-reserved-key-names'
      )
    );
  });

  it('should fail on unsupported metadata key', async () => {
    const file = join(pathToStub, 'jsondocuments', 'invalidFields.json');
    await expect(parse(file)).rejects.toThrowErrorMatchingSnapshot();
  });

  it.todo('should only push JSON documents'); // TODO: from mix documents
});
