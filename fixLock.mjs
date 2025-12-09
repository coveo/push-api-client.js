import {readFileSync, writeFileSync} from 'node:fs';
import detectIndent from 'detect-indent';

let lock = readFileSync('package-lock.json', 'utf8');
const indent = detectIndent(lock).indent;
console.log(indent);
const lockJSON = JSON.parse(lock);
lockJSON.packages['node_modules/@coveo/push-api-client'].version =
  lockJSON.version;
writeFileSync('package-lock.json', JSON.stringify(lockJSON, undefined, indent));
