import {lstatSync, PathLike, readdirSync} from 'fs';
import {join} from 'path';

export const isJsonFile = (documentPath: PathLike) => {
  return documentPath.toString().endsWith('.json');
};

export const getAllJsonFilesFromEntries = (
  filesOrDirectories: string[],
  fileNames: string[] = []
): string[] => {
  filesOrDirectories.flatMap((entry) => {
    if (lstatSync(entry).isDirectory()) {
      recursiveDirectoryRead(entry, fileNames);
    } else {
      fileNames.push(entry);
    }
  });

  return fileNames.filter(isJsonFile);
};

const recursiveDirectoryRead = (folder: string, accumulator: string[] = []) => {
  readdirSync(folder, {withFileTypes: true}).map((dirent) => {
    if (dirent.isDirectory()) {
      recursiveDirectoryRead(join(folder, dirent.name), accumulator);
    } else if (dirent.isFile()) {
      accumulator.push(join(folder, dirent.name));
    }
  });
};
