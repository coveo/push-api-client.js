import {join} from 'path';
import {cwd} from 'process';
import {parseAndGetDocumentBuilderFromJSONDocument} from './parseFile';
import {InvalidDocument} from './validatorErrors';

describe('parseFile', () => {
  const pathToStub = join(cwd(), 'src', '__stub__');
  const parse = (file: string) => () =>
    parseAndGetDocumentBuilderFromJSONDocument(file);

  it('should accept non-url documentIDs', () => {
    const file = join(pathToStub, 'jsondocuments', 'notAnUrl.json');
    expect(() =>
      parseAndGetDocumentBuilderFromJSONDocument(file)
    ).not.toThrow();
  });

  it.each([
    {
      fileName: 'noTitle.json',
      error: 'title: value is required.',
    },
    {
      fileName: 'noId.json',
      error: 'documentid: value is required.',
    },
    {
      fileName: 'noIdentity.json',
      error: 'allowedpermissions:  value does not contain identity',
    },
    {
      fileName: 'identityNotAString.json',
      error: 'allowedpermissions:   value is not a string.',
    },
    {
      fileName: 'identityAllowAnonymousNotABoolean.json',
      error: 'allowanonymous: value is not a boolean.',
    },
    {
      fileName: 'identityTypeInvalidValue.json',
      error:
        'allowedpermissions:   value should be one of: UNKNOWN, USER, GROUP, VIRTUAL_GROUP.',
    },
  ])('should fail on missing $missingProp', ({fileName, error}) => {
    const file = join(pathToStub, 'jsondocuments', fileName);
    expect(parse(file)).toThrow(
      new InvalidDocument(
        file,
        `Document contains an invalid value for ${error}`
      )
    );
  });
});
