// TODO: @louis-bompart 2023, Open a bug to NPM. lockfile doesn't update version of self-import. boo. If you read this past Jan 10th and you're not @louis-bompart, poke him.

import {readFileSync, writeFileSync} from 'node:fs';
import detectIndent from 'detect-indent';

let lock = readFileSync('package-lock.json', 'utf8');
const indent = detectIndent(lock).indent;
console.log(indent)
const lockJSON = JSON.parse(lock);
lockJSON.packages['node_modules/@coveo/push-api-client'].version =
  lockJSON.version;
writeFileSync('package-lock.json',JSON.stringify(lockJSON, undefined, indent));
