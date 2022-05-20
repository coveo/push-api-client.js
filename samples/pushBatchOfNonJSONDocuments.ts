import {
  PushSource,
  DocumentBuilder,
  BatchUpdateDocuments,
} from '@coveo/push-api-client';
import {readFileSync} from 'node:fs';
import {join, parse} from 'node:path';
import {gzipSync} from 'node:zlib';
/*
 * By default, the maximal size of a file is 2Mb. To increase it, uncomment the following comment block,
 * and set the value of `maxBodyLength` to the value of your choice. If none of your files exceed the 2Mb
 * mark, then you have nothing to do.
 */
/* 
 * import axios from 'axios';
 * axios.defaults.maxBodyLength = 1e99 // or the value of your choice.
 */
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

  const myBatchOfDocuments: BatchUpdateDocuments = {
    addOrUpdate: myDocuments,
    delete: [],
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
