import {join} from 'path';
import {cwd} from 'process';
import {getAllJsonFilesFromEntries, isJsonFile} from './file';

describe('file', () => {
  const fileList = [
    'na/na/na/na/batman.json',
    'not/a/json/file.txt',
    'another/json/file.json',
  ];
  const pathToStub = join(cwd(), 'src', '__stub__');

  it('should filter out non JSON documents', () => {
    const validFiles = fileList.filter(isJsonFile);
    expect(validFiles).toEqual([
      'na/na/na/na/batman.json',
      'another/json/file.json',
    ]);
  });

  it('should return a list of JSON files', () => {
    const folders = [join(pathToStub, 'mixdocuments')];
    const files = [
      join(pathToStub, 'jsondocuments', 'batman.json'),
      join(pathToStub, 'jsondocuments', 'fightclub.json'),
    ];
    const entries = [...files, ...folders];
    const validJsonFiles = getAllJsonFilesFromEntries(entries);
    expect(validJsonFiles).toEqual([
      join(pathToStub, 'jsondocuments', 'batman.json'),
      join(pathToStub, 'jsondocuments', 'fightclub.json'),
      join(pathToStub, 'mixdocuments', 'valid.json'),
    ]);
  });
});
