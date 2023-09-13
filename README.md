# @coveo/push-api-client.js

Coveo Push API client

## Installation

`npm i @coveo/push-api-client`

## Features

- Upload data to both Push and Catalog sources
- Pre-push document validation
- Automatic custom field creation
- Full catalog upload and incremental document update
- Optimized for large payload uploads

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
  const source = new CatalogSource('my_api_key', 'my_coveo_organization_id', {maxRetries=10, retryAfter: 2000, timeMultiple: 3});
  await source
    .batchStreamDocumentsFromFiles('my_source_id', ['path/to/file_or_folder'])
    .batch();
}

main();
```

See more examples in the `./samples` folder.

### Proxy configuration

You can use the `HTTPS_PROXY` or `https_proxy` environment variable for proxy configuration.
Read more about it [here](https://about.gitlab.com/blog/2021/01/27/we-need-to-talk-no-proxy/).

### Exponential backoff configuration

You can configure exponential that will be applied to all outgoing requests from the SDK. You may configure this through a `PlatformUrlOptions` object.

Outgoing requests will retry when a `429` status code is returned from the platform. By default, the will wait retry a maximum of 50 times, waiting 5 seconds between attempts, with a time multiple of 2 (5 seconds for first attempt, 10 for second, 20 for third, etc).

## Local development

- `npm i`
- Copy `env.sample` to `.env`, and replace the variables with proper values.
- `npm run dev` to compile and run `./src/localtest.ts`.
- `npm run test` for unit tests.

## Commit

Use `npm run commit` to get a properly formatted commit message which will help control the versioning and CHANGELOG generation.

## Release

Run Github action named `release`, which will bump version, tag and publish to npm.
