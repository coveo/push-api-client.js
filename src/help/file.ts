import {lstatSync, PathLike, readdirSync} from 'fs';
import path = require('path');

export const isJsonFile = (documentPath: PathLike) => {
  return documentPath.toString().endsWith('.json');
};

export const getAllJsonFilesFromEntries = (
  filesOrDirectories: string[]
): string[] => {
  return filesOrDirectories
    .flatMap((entry) => {
      if (lstatSync(entry).isDirectory()) {
        return readdirSync(entry).map((f) => `${path.join(entry, f)}`);
      } else {
        return entry;
      }
    })
    .filter(isJsonFile);
};
