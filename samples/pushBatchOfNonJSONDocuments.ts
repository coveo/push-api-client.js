import {PushSource, DocumentBuilder} from '@coveo/push-api-client';
import {readFileSync} from 'node:fs';
import {join, parse} from 'node:path';
import {gzipSync} from 'node:zlib';

async function main() {
  const source = new PushSource('MY_API_KEY', 'MY_ORG_ID');
  source.setSourceStatus('MY_SOURCE_ID', 'REFRESH');

  const baseLocalDirectory = 'myData';
  const baseRemoteUrl = 'https://my.document.uri';

  const myDocuments = ['myFirstDoc.pdf', 'mySecondDoc.docx'].map((fileName) =>
    new DocumentBuilder(`${baseRemoteUrl}/${fileName}`, fileName)
      .withCompressedBinaryData(
        prepareDocument(join(baseLocalDirectory, fileName)),
        'GZIP'
      )
      .withFileExtension(parse(fileName).ext)
  );

  const myBatchOfDocuments = {
    addOrUpdate: myDocuments,
  };
  await source.batchUpdateDocuments('MY_SOURCE_ID', myBatchOfDocuments);
  source.setSourceStatus('MY_SOURCE_ID', 'IDLE');
}

main();

/**
 * Prepare a file to be pushed as binaryData.
 * @param filepath The path to the file to compress
 * @returns the file, compressed and encoded in Base64
 */
function prepareDocument(filepath: string): string {
  const document = readFileSync(filepath);
  const compressedDocument = gzipSync(document);
  return compressedDocument.toString('base64');
}
