// eslint-disable-next-line node/no-unpublished-import
import 'dotenv/config';
import {DocumentBuilder} from './documentBuilder';
import {UserSecurityIdentityBuilder} from './securityIdentityBuilder';
const API_KEY = process.env.API_KEY as string;
const ORG_ID = process.env.ORG_ID as string;
const SOURCE_ID = process.env.SOURCE_ID as string;

import {Source} from './source';

async function main() {
  const source = new Source(API_KEY, ORG_ID);
  const docBuilder = new DocumentBuilder(
    'https://perdu.com/2',
    'hello world title'
  )
    .withAuthor('anonymous@coveo.com')
    .withClickableUri('https://perdu.com/click')
    .withData('the content of the document')
    .withFileExtension('.html')
    .withAllowedPermissions(
      new UserSecurityIdentityBuilder('olamothe@coveo.com')
    )
    .withDeniedPermissions(
      new UserSecurityIdentityBuilder([
        'ylakhdar@coveo.com',
        'lbompart@coveo.com',
      ])
    );
  const result = await source.addOrUpdateDocument(SOURCE_ID, docBuilder);
  console.log('STATUS CREATE', result.status);

  const resultDelete = await source.deleteDocument(
    SOURCE_ID,
    'https://does.not.exists.com'
  );
  console.log('STATUS DELETE', resultDelete.status);

  const yesterday = new Date();
  yesterday.setDate(new Date().getDate() - 1);
  const resultDeleteOlderThan = await source.deleteDocumentsOlderThan(
    SOURCE_ID,
    yesterday
  );
  console.log('STATUS DELETE OLDER THAN', resultDeleteOlderThan.status);
}

main();
