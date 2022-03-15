# TypeScript NPM Package Builder (for myself)

## Installation

(This package is not yet published to NPM registry, so presumably)

```shell
$ npm install --dev @yume-chan/ts-package-builder typescript
```

TypeScript is a peer dependency that must be installed separately (so you can use any version you want).

```shell
$ npm install tslib
```

The default configuration has `"importHelpers": true`, so `tslib` is required (and it is a production dependency, not dev dependency).

## Config

A `tsconfig.json` file at package root is required for both this builder and editors.

```jsonc
{
    // Extends default configurations.
    "extends": "./node_modules/@yume-chan/ts-package-builder/tsconfig.base.json",

    // (Optional) Add override configurations.
    "compilerOptions": {
        // All TypeScript configurations are allowed.
        "target": "ES2016",

        // Add extra ambient types.
        // Don't forget to include "jest" unless you don't write unit tests.
        // The default is `[ "jest" ]`
        "types": [
            "w3c-web-usb",
            "jest",
            "node"
        ]
    },
    // (Optional) Specify types that's only used in tests.
    // They will be excluded in ESModule build,
    // to make sure library code doesn't accidentally use them.
    // (for example, a browser targeted libraries should not use types from `@types/node`)
    "testTypes": [
        "jest",
        "node"
    ],
    // (Optional) Add project references to improve editing experience.
    // However, because the builder is intended to be used with some monorepo manager
    // (lerna, yarn workspace, rush, etc.), and they all have good built-in support
    // for building all packages following dependency graph, it **does not** use
    // project references when building.
    "references": [
        {
            "path": "../dependency-a/tsconfig.json"
        },
        {
            "path": "../dependency-b/tsconfig.json"
        }
    ]
}
```

## Building

```shell
$ npx build-ts-package
```

Or add a script to `package.json`

```json
{
    "scripts": {
        "build": "build-ts-package",
    },
}
```

The builder outputs Node.js compatible ES Module, with source maps, TypeScript declarations, and declaration maps.

| Module             | Output Directory | Excluded Files | Excluded Types |
| ------------------ | ---------------- | -------------- | -------------- |
| ESModule           | `esm`            | `*.spec.ts`    | `@types/jest`  |
| Declaration (d.ts) | `dts`            | `*.spec.ts`    | `@types/jest`  |

Example `package.json`:

```json
{
    "main": "esm/index.js",
    "types": "dts/index.d.ts",
}
```

## Unit test with Jest

Test file convention: put `.spec.ts` files inside `src`, alongside the source file that will be tested.

Like this:

- src
  - index.ts
  - index.spec.ts

The `.spec.ts` files will be compiled to CommonJS for Jest (so no `ts-jest` required).

Use the following `jest.config.js` file to find them:

```js
module.exports = {
    testMatch: ['<rootDir>/cjs/**/*.spec.js'],
};
```

## Publishing

Because `.spec.ts` files have been compiled to CommonJS, you can exclude them using `.npmignore`:

```gitignore
**/*.spec.ts
**/*.spec.js
**/*.spec.js.map
```
