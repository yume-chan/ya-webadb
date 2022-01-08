# @yume-chan/scrcpy

TypeScript implementation of [Scrcpy](https://github.com/Genymobile/scrcpy) client.

It uses the official Scrcpy server releases.

**WARNING:** The public API is UNSTABLE. If you have any questions, please open an issue.

## Download Server Binary

This package has a script `fetch-scrcpy-server` to help you download the official server binary.

The server binary is subject to [Apache License 2.0](https://github.com/Genymobile/scrcpy/blob/master/LICENSE).

Usage:

```
$ npx fetch-scrcpy-server <version>
```

For example:

```
$ npx fetch-scrcpy-server 1.21
```

You can also add it to the `postinstall` script of your `package.json` so it will run automatically when you do `npm install`:

```json
"scripts": {
    "postinstall": "fetch-scrcpy-server 1.21",
},
```

It will download the binary to `bin/scrcpy` and write the version string to `bin/version.js`. You can import the version string with

```js
import SCRCPY_SERVER_VERSION from '@yume-chan/scrcpy/bin/version';
```

And import the server binary with [file-loader](https://v4.webpack.js.org/loaders/file-loader/) (Webpack 4) or [Asset Modules](https://webpack.js.org/guides/asset-modules/) (Webpack 5).

## Option versions

Scrcpy server has no backward compatibility on options input format. Currently the following versions are supported:

| versions  | type                |
| --------- | ------------------- |
| 1.16~1.17 | `ScrcpyOptions1_16` |
| 1.18~1.20 | `ScrcpyOptions1_18` |
| 1.21      | `ScrcpyOptions1_21` |

You must use the correct type according to the server version.
