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
  const source = new CatalogSource('my_api_key', 'my_coveo_organization_id');
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

By default, the SDK leverages an exponential backoff mechanism. Exponential backoff allows for the SDK to make multiple attempts to resolve throttled requests, increasing the amount of time to wait for each subsequent attempt. Outgoing requests will retry when a `429` status code is returned from the platform.

You may configure the exponential backoff that will be applied to all outgoing requests. To do so, specify a `PlatformOptions` object when creating either a `CatalogSource` or `PushSource` object:

```js
  const catalogSource = new CatalogSource('my_api_key', 'my_coveo_organization_id', {maxRetries: 10, retryAfter: 2000, timeMultiple: 3});
  const pushSource = new PushSource('my_api_other_key', 'my_other_coveo_organization_id', {maxRetries: 3, retryAfter: 600000});
```

By default, requests will retry a maximum of 10 times, waiting 5 seconds after the first attempt, with a time multiple of 2 (5 seconds for first attempt, 10 for second, 20 for third, etc).

## Local development

- `npm i`
- Copy `env.sample` to `.env`, and replace the variables with proper values.
- `npm run dev` to compile and run `./src/localtest.ts`.
- `npm run test` for unit tests.

## Commit

Use `npm run commit` to get a properly formatted commit message which will help control the versioning and CHANGELOG generation.

## Release

Run Github action named `release`, which will bump version, tag and publish to npm.
