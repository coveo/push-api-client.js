// eslint-disable-next-line node/no-unpublished-import
import 'dotenv/config';
const API_KEY = process.env.API_KEY as string;
const ORG_ID = process.env.ORG_ID as string;
const SOURCE_ID = process.env.SOURCE_ID as string;

import {Source} from './source';

async function main() {
  const source = new Source(API_KEY, ORG_ID);
  const result = await source.addOrUpdateDocument(SOURCE_ID, {
    uri: 'https://perdu.com',
    data: 'hello world',
    title: 'hello world title',
    permissions: [{allowAnonymous: true}],
  });
  console.log('STATUS', result.status);
}

main();
