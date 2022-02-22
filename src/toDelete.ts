import PlatformClient, {
  Environment,
  FieldTypes,
} from '@coveord/platform-client';
import {
  BatchUpdateDocuments,
  DocumentBuilder,
  PlatformEnvironment,
  Source,
} from '.';

async function main() {
  const source = new Source(
    'xx1e1896ec-e863-441f-890f-a959a2cb23d5',
    'clitestljhqj8vc',
    {environment: PlatformEnvironment.Dev}
  );

  const myDocument = new DocumentBuilder('https://my.broken.uri', 'Broken doc')
    .withAuthor('bob')
    .withClickableUri('https://my.document.click.com')
    .withData('these words will be searchable')
    .withFileExtension('.html')
    // A field should be created in the organization and mapped to the source for these to be available on documents
    // See https://docs.coveo.com/en/1833
    .withMetadata({
      allo: 'allo',
    });

  const myDocument2 = new DocumentBuilder(
    'https://my.document.uri2',
    'My document title2'
  )
    .withAuthor('bob')
    .withClickableUri('https://my.document.click.com')
    .withData('these words will be searchable')
    .withFileExtension('.html')
    .withMetadata({
      tags: ['the_first_tag', 'the_second_tag'],
      seconddocmeta: 'tes',
      custom: 12,
      author: 'dsads',
      description: 'dsads',
      ec_promo_price: 'dsads',
      ec_rating: 'dsads',
      ec_shortdesc: 'dsads',
      ec_skus: 1234,
      ec_thumbnails: 'dsads',
      allo: 123.2,
    });

  const myBatchOfDocuments: BatchUpdateDocuments = {
    addOrUpdate: [myDocument],
    delete: [],
  };

  const batch = {
    addOrUpdate: [
      new DocumentBuilder('the_uri_1', 'the_title_1'),
      new DocumentBuilder('the_uri_2', 'the_title_2'),
    ],
    delete: [],
  };

  try {
    await source.batchUpdateDocuments(
      'clitestljhqj8vc-tong3w7sfmi6qe73so5k3xcao4',
      batch
    );
  } catch (error) {
    console.log('*********************');
    console.log(error);
    console.log('*********************');
  }
}

main();
