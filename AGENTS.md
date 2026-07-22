# AGENTS.md

## Prerequisites

- **Node.js**: version `^18.12.0`, `^20.10.0`, or `^22.11.0` (see `.nvmrc` for the recommended version). Use [nvm](https://github.com/nvm-sh/nvm) to manage Node.js versions:
  ```sh
  nvm install
  nvm use
  ```
- **npm**: included with Node.js. Install project dependencies before running any commands:
  ```sh
  npm install
  ```

## Build

Compiles TypeScript sources to JavaScript using `tsc`:

```sh
npm run build
```

Output is written to the `dist/` directory.

## Test

Runs the test suite with [Jest](https://jestjs.io/):

```sh
npm test
```

To run tests in watch mode during development:

```sh
npm run test:dev
```

## Lint

Checks formatting with [Prettier](https://prettier.io/) and lints with [ESLint](https://eslint.org/):

```sh
npm run lint
```

To auto-fix ESLint issues:

```sh
npm run lint:fix
```

To auto-fix Prettier formatting:

```sh
npm run prettier:fix
```
