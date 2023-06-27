# @yume-chan/fetch-scrcpy-server

A script to download Scrcpy server binary.

## Usage

```shell
fetch-scrcpy-server <version>
```

For example:

```shell
fetch-scrcpy-server 2.1
```

The server binary is written to `server.bin` and the version is written to `version.js` in this package's root.

## Autorun

Add to `postinstall` script in `package.json`:

```json
{
    "scripts": {
        "postinstall": "fetch-scrcpy-server 2.1"
    }
}
```

## Use in code

### Webpack/Vite

It works out of the box for Webpack 5 and Vite.

`BIN` is a URL you can use in `fetch` to download.

```js
import { BIN, VERSION } from "@yume-chan/fetch-scrcpy-server";

console.log(VERSION); // 2.1
fetch(BIN)
    .then((res) => res.arrayBuffer())
    .then(console.log); // <ArrayBuffer ...>
```

### Node.js

This package is in ES Module format, so it needs to be imported in another ES Module, or using `createRequire`.

`BIN` is a URL to a local file, you can use `fs.readFile` to read it.

```js
import { BIN, VERSION } from "@yume-chan/fetch-scrcpy-server";
import fs from "fs/promises";

console.log(VERSION); // 2.1
fs.readFile(BIN).then(console.log); // <Buffer ...>
```
