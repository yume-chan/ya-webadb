# @yume-chan/scrcpy

TypeScript implementation of [Scrcpy](https://github.com/Genymobile/scrcpy) client.

It's compatible with the official Scrcpy server binaries.

**WARNING:** The public API is UNSTABLE. If you have any questions, please open an issue.

- [Transport agnostic](#transport-agnostic)
- [Prepare server binary](#prepare-server-binary)
  - [`fetch-scrcpy-server`](#fetch-scrcpy-server)
  - [Use the server binary](#use-the-server-binary)
    - [Node.js CommonJS](#nodejs-commonjs)
    - [Node.js ES module](#nodejs-es-module)
    - [Webpack 4](#webpack-4)
    - [Webpack 5](#webpack-5)
- [Push and start server on device](#push-and-start-server-on-device)
  - [Using `@yume-chan/adb`](#using-yume-chanadb)
  - [Using other transportation](#using-other-transportation)
- [Option versions](#option-versions)
- [Consume the streams](#consume-the-streams)
- [Video stream](#video-stream)
- [Web Decoders](#web-decoders)
  - [WebCodecs decoder](#webcodecs-decoder)
  - [TinyH264 decoder](#tinyh264-decoder)

## Transport agnostic

Although it was initially written to use with `@yume-chan/adb`, the `ScrcpyClient` class can be used with any transportation. More details later.

## Prepare server binary

Scrcpy needs a server binary running on the device in order to work. This package doesn't ship with one.

You can download the server binary from official releases (https://github.com/Genymobile/scrcpy/releases) yourself, or use the built-in `fetch-scrcpy-server` script to automate the process.

The server binary is subject to [Apache License 2.0](https://github.com/Genymobile/scrcpy/blob/master/LICENSE).

### `fetch-scrcpy-server`

To use the script, first add `gh-release-fetch@3` to your `devDependencies`. It's not automatically installed to minimize download size.

Then you can execute it from terminal:

```
$ npx fetch-scrcpy-server <version>
```

For example:

```
$ npx fetch-scrcpy-server 1.24
```

Or adding it to the `postinstall` script in `package.json`, so running `npm install` will automatically invoke the script.

```json
"scripts": {
    "postinstall": "fetch-scrcpy-server 1.24",
},
```

The server binary will be named `bin/scrcpy-server`.

### Use the server binary

The server binary file needs to be embedded in your application, the exact method depends on your runtime.

To name a few:

#### Node.js CommonJS

```ts
const fs = require('fs');
const path: string = require.resolve('@yume-chan/scrcpy/bin/scrcpy-server'); // Or your own server binary path
const buffer: Buffer = fs.readFileSync(path);
```

#### Node.js ES module

```js
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const path: string = createRequire(import.meta.url).resolve('@yume-chan/scrcpy/bin/scrcpy-server'); // Or your own server binary path
const buffer: Buffer = await fs.readFile(path);
```

In future it should be possible to use `import.meta.resolve` (https://nodejs.org/api/esm.html#importmetaresolvespecifier-parent) instead.

```ts
const path: string = import.meta.resolve('@yume-chan/scrcpy/bin/scrcpy-server');
```

#### Webpack 4

Requires installing and configuring file-loader (https://v4.webpack.js.org/loaders/file-loader/)

```ts
import SCRCPY_SERVER_URL from '@yume-chan/scrcpy/bin/scrcpy-server'; // Or your own server binary path
const buffer: ArrayBuffer = await fetch(SCRCPY_SERVER_URL).then(res => res.arrayBuffer());
```

#### Webpack 5

Requires configuring Asset Modules (https://webpack.js.org/guides/asset-modules/)

```ts
const SCRCPY_SERVER_URL = new URL('@yume-chan/scrcpy/bin/scrcpy-server', import.meta.url); // Or your own server binary path
const buffer: ArrayBuffer = await fetch(SCRCPY_SERVER_URL).then(res => res.arrayBuffer());
```

## Push and start server on device

The the server binary needs to be copied to the device and run on it.

### Using `@yume-chan/adb`

The `Adb#sync()#write()` method can be used to push files to the device. Read more at `@yume-chan/adb`'s documentation (https://github.com/yume-chan/ya-webadb/tree/master/libraries/adb#readme).

This package also provides the `pushServer()` method as a shortcut for `Adb#sync().write()`, plus automatically close the `AdbSync` object when complete.

Example using `write()`:

```ts
import { AdbScrcpyClient } from '@yume-chan/scrcpy';

const adbScrcpy = new AdbScrcpyClient(adb);
const stream: WritableStream<Uint8Array> = adbScrcpy.pushServer();
const writer = stream.getWriter();
await writer.write(new Uint8Array(buffer));
await writer.close();
```

Example using `pipeTo()`:

```ts
import { WrapReadableStream } from '@yume-chan/adb';
import { AdbScrcpyClient } from '@yume-chan/scrcpy';

const adbScrcpy = new AdbScrcpyClient(adb);
await fetch(SCRCPY_SERVER_URL)
    .then(response => new WrapReadableStream(response.body))
    .then(stream => stream.pipeTo(adbScrcpy.pushServer()))
```

The `WrapReadableStream` is required because native `ReadableStream`s can't `pipeTo()` non-native `WritableStream`s (`@yume-chan/adb` is using ponyfill from `web-streams-polyfill`)

To start the server, use the `start()` method:

```js
import { AdbScrcpyClient, DEFAULT_SERVER_PATH } from '@yume-chan/scrcpy';

const adbScrcpy = new AdbScrcpyClient(adb);
const client: ScrcpyClient = await adbScrcpy.start(DEFAULT_SERVER_PATH, "1.24", new ScrcpyOptions1_24({
    // options
}));
```

The third argument is the server version. The server will refuse to start if it mismatches.

When using `fetch-scrcpy-server` to download server binary, the version string is saved to `bin/version.js`.

```js
import SCRCPY_SERVER_VERSION from '@yume-chan/scrcpy/bin/version.js';

console.log(SCRCPY_SERVER_VERSION); // "1.24"
```

### Using other transportation

You need to push and start the server yourself. After that, create the client using its constructor:

```ts
import { ScrcpyClient } from '@yume-chan/scrcpy';

const stdout: ReadableStream<string>; // get the stream yourself
const videoStream: ReadableStream<Uint8Array>; // get the stream yourself
const controlStream: ReadableWritablePair<Uint8Array, Uint8Array> | undefined // get the stream yourself

const client = new ScrcpyClient(new ScrcpyOptions1_24({
    // options
}), stdout, videoSteam, controlStream);
```

Constrains:

1. The `stdout` stream will end when the server is closed.
2. `cancel` the `stdout` will kill the server.
3. `videoStream` will read from server's video socket, preserving packet boundaries.
4. `controlStream.readable` will read from server's control socket.
5. `controlStream.writable` will write to server's control socket.

The `controlStream` is optional if control is not enabled or handled elsewhere.

When the client is directly created, only the following methods in `options` will be used:

* `createVideoStreamTransformer()`
* `getControlMessageTypes()`
* `serializeInjectScrollControlMessage()`
* `serializeBackOrScreenOnControlMessage()`

## Option versions

Scrcpy server has many breaking changes between versions, so there is one option class for each version (range).

The latest one may continue to work for future server versions, but there is no guarantee.

| Version   | Type                |
| --------- | ------------------- |
| 1.16~1.17 | `ScrcpyOptions1_16` |
| 1.18~1.20 | `ScrcpyOptions1_18` |
| 1.21      | `ScrcpyOptions1_21` |
| 1.22      | `ScrcpyOptions1_22` |
| 1.23      | `ScrcpyOptions1_23` |
| 1.24      | `ScrcpyOptions1_24` |

## Consume the streams

Both `stdout` and `videoStream` must be continuously read, otherwise the connection will stall.

```ts
const abortController = new AbortController();

client.stdout
    .pipeTo(
        new WritableStream<string>({
            write: (line) => {
                // Handle the stdout line
            },
        }),
        { signal: abortController.signal }
    )
    .catch(() => {})
    .then(() => {
        // Handle server exit
    });

client.videoStream.pipeTo(new WritableStream<VideoStreamPacket>({
    write: (packet) => {
        // Handle the video packet
    },
}));

// to stop the server
abortController.abort();
```

## Video stream

The data from `videoStream` has two types: `configuration` and `frame`. How much parsed data is available depends on the server options.

```ts
export interface VideoStreamConfigurationPacket {
    type: 'configuration';
    data: H264Configuration;
}

export interface VideoStreamFramePacket {
    type: 'frame';
    keyframe?: boolean | undefined;
    pts?: bigint | undefined;
    data: Uint8Array;
}
```

When `sendFrameMeta: false` is set, `videoStream` only contains `frame` packets, and only the `data` field is available. It's commonly used when feeding into decoders like FFmpeg that can parse the H.264 stream itself, or saving to disk directly.

Otherwise, both `configuration` and `frame` packets are available.

* `configuration` packets contain the parsed SPS data, and can be used to initialize a video decoder.
* `pts` (and `keyframe` field from server version 1.23) fields in `frame` packets are available to help decode the video.

## Web Decoders

There are two built-in decoders for using in Web Browsers:

| Name              | Chrome | Firefox | Safari | Performance                     | Supported H.264 profile/level |
| ----------------- | ------ | ------- | ------ | ------------------------------- | ----------------------------- |
| WebCodecs decoder | 94     | No      | No     | High with Hardware acceleration | High level 5                  |
| TinyH264 decoder  | 57     | 52      | 11     | Poor                            | Baseline level 4              |

General usage:

```ts
const decoder = new H264Decoder(); // `WebCodecsDecoder` or `TinyH264Decoder`
document.body.appendChild(decoder.element);

client.videoStream
    .pipeTo(decoder.writable)
    .catch(() => { });
```

### WebCodecs decoder

Using the [WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API). The video stream will be decoded into `VideoFrame`s and drawn onto a 2D canvas.

It has no dependencies and high compatibility/performance, but are only available on recent versions of Chrome.

### TinyH264 decoder

It's the old Android H.264 software decoder (now deprecated and removed), compiled into WebAssembly, and wrapped in Web Worker to prevent blocking the main thread.

The video stream will be decoded into YUV frames, then converted to RGB using a WebGL shader.

It depends on `tinyh264`, `yuv-buffer` and `yuv-canvas` packages, which are not automatically installed.

The bundler you use must also support the `new Worker(new URL('./worker.js', import.meta.url))` syntax. It's known to work with Webpack 5.
