# @coveo/push-api-client.js

Coveo Push API client

## Installation

`npm i @coveo/push-api-client`

## Features
* Upload data to both Push and Catalog sources
* Pre-push document validation
* Automatic custom field creation
* Full catalog upload and incremental document update
* Optimized for large payload uploads

## Usage

```js
import {PushSource, DocumentBuilder} from '@coveo/push-api-client';

async function main() {
  const source = new PushSource('my_api_key', 'my_coveo_organization_id');

  const myDocument = new DocumentBuilder(
    'https://my.document.uri',
    'My document title'
  ).withData('these words will be searchable');

  await source.addOrUpdateDocument('my_source_id', myDocument);
}

main();
```

You can also upload your data into a catalog source
```js
async function main() {
  const source = new CatalogSource('my_api_key', 'my_coveo_organization_id');
  await source
    .batchStreamDocumentsFromFiles('my_source_id', ['path/to/file_or_folder'])
    .batch();
}

main();

```

See more examples in the `./samples` folder.

## Local development

- `npm i`
- Copy `env.sample` to `.env`, and replace the variables with proper values.
- `npm run dev` to compile and run `./src/localtest.ts`.
- `npm run test` for unit tests.

## Commit

Use `npm run commit` to get a properly formatted commit message which will help control the versioning and CHANGELOG generation.

## Release

Run Github action named `release`, which will bump version, tag and publish to npm.
