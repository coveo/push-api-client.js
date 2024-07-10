import 'dotenv/config';
import {DocumentBuilder} from './documentBuilder';
import {UserSecurityIdentityBuilder} from './securityIdentityBuilder';
import {BatchUpdateDocuments, PlatformEnvironment, Region} from '.';
import {PushSource} from './source/push';
import {PermissionSetBuilder} from './permissionSetBuilder';
const API_KEY = process.env.API_KEY as string;
const ORG_ID = process.env.ORG_ID as string;
const SOURCE_ID = process.env.SOURCE_ID as string;

async function main() {
  const source = new PushSource(API_KEY, ORG_ID, {
    environment: PlatformEnvironment.Dev,
    region: Region.US,
    retryAfter: 5000,
    maxRetries: 5,
  });
  await source.setSourceStatus(SOURCE_ID, 'REFRESH');
  const allowedPermissionSet = new PermissionSetBuilder(false)
    .withAllowedPermissions(
      new UserSecurityIdentityBuilder([
        'olamothe@coveo.com',
        'dbrooke@coveo.com',
        'pdoyon@coveo.com',
        'memyrand@coveo.com',
        'yhattab@coveo.com',
      ])
    )
    .withDeniedPermissions(
      new UserSecurityIdentityBuilder([
        'ylakhdar@coveo.com',
        'lbompart@coveo.com',
      ])
    );
  const docBuilder = new DocumentBuilder(
    'https://perdu.com',
    'hello world title'
  )
    .withAuthor('anonymous@coveo.com')
    .withClickableUri('https://perdu.com/click')
    .withData('the content of the document')
    .withMetadataValue('foo', 'bar')
    .withDate('2000/01/01')
    .withFileExtension('.html')
    .withPermissionSet(allowedPermissionSet);
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

  const batch: BatchUpdateDocuments = {
    addOrUpdate: [],
    delete: [],
  };

  const permissionSet = new PermissionSetBuilder(false).withAllowedPermissions(
    new UserSecurityIdentityBuilder('olamothe@coveo.com')
  );

  for (let i = 0; i < 10; i++) {
    const docID = `https://perdu.com/${i}`;
    if (i < 8) {
      console.log('Pushing docId', docID);
      batch.addOrUpdate.push(
        new DocumentBuilder(docID, `Doc number ${i}`).withPermissionSet(
          permissionSet
        )
      );
    } else {
      batch.delete.push({documentId: docID, deleteChildren: true});
    }
  }

  const batchResult = await source.batchUpdateDocuments(SOURCE_ID, batch);
  console.log('STATUS BATCH', batchResult.status);
  await source.setSourceStatus(SOURCE_ID, 'IDLE');
}

main();
