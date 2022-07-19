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
  - [Read the server version](#read-the-server-version)
- [Option versions](#option-versions)
- [Use with `@yume-chan/adb`](#use-with-yume-chanadb)
  - [Push server binary](#push-server-binary)
  - [Start server on device](#start-server-on-device)
- [Using other transportation](#using-other-transportation)
  - [Parsing video packets](#parsing-video-packets)
  - [Sending control messages](#sending-control-messages)
  - [Reading device messages](#reading-device-messages)
- [Consume the streams](#consume-the-streams)
- [Video stream](#video-stream)
- [Decode video stream](#decode-video-stream)

## Transport agnostic

It was initially designed to be used with `@yume-chan/adb`, but now it can also to used with any other transportation.

## Prepare server binary

Scrcpy needs a server binary running on the device in order to work. This package doesn't ship with one.

You can download the server binary from official releases (https://github.com/Genymobile/scrcpy/releases), or use the built-in `fetch-scrcpy-server` script to automate the process.

The server binary is subject to [Apache License 2.0](https://github.com/Genymobile/scrcpy/blob/master/LICENSE).

### `fetch-scrcpy-server`

To use the script, first add `gh-release-fetch@3` to `devDependencies` of your `package.json`. It's an optional peer dependency fpr minimized download size.

Then you can invoke it in a terminal:

```
$ npx fetch-scrcpy-server <version>
```

For example:

```
$ npx fetch-scrcpy-server 1.24
```

You can also add it to the `postinstall` script in your `package.json`. After that, running `npm install` will automatically invoke the script.

```json
"scripts": {
    "postinstall": "fetch-scrcpy-server 1.24",
},
```

The server binary will be named `bin/scrcpy-server` in this package's installation directory (usually in `node_modules`).

### Use the server binary

The server binary file needs to be embedded into your application, the exact method depends on the runtime.

To name a few:

#### Node.js CommonJS

```ts
const fs = require('fs');
const path: string = require.resolve('@yume-chan/scrcpy/bin/scrcpy-server'); // Or your own server binary path
const buffer: Buffer = fs.readFileSync(path);
```

#### Node.js ES module

```ts
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const path: string = createRequire(import.meta.url).resolve('@yume-chan/scrcpy/bin/scrcpy-server'); // Or your own server binary path
const buffer: Buffer = await fs.readFile(path);
```

Currently, ES Module doesn't have a `resolve` function like `require.resolve` in CommonJS, so `createRequire` is used to create a CommonJS resolver.

`import.meta.resolve` (https://github.com/whatwg/html/pull/5572) is a proposal that fills this gap. Node.js already has experimental support for it behind a flag. See https://nodejs.org/api/esm.html#importmetaresolvespecifier-parent for more information.

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

### Read the server version

The correct version number is required to launch the server, so `fetch-scrcpy-server` also writes the version number to `bin/version.js`.

```js
import SCRCPY_SERVER_VERSION from '@yume-chan/scrcpy/bin/version.js';

console.log(SCRCPY_SERVER_VERSION); // "1.24"
```

## Option versions

Scrcpy server options changes over time, and some of them are not backwards compatible. This package provides option types for each version (or range). Using wrong option version usually results in errors.

The latest one may continue to work for future server versions, but there is no guarantee.

| Version   | Type                |
| --------- | ------------------- |
| 1.16~1.17 | `ScrcpyOptions1_16` |
| 1.18~1.20 | `ScrcpyOptions1_18` |
| 1.21      | `ScrcpyOptions1_21` |
| 1.22      | `ScrcpyOptions1_22` |
| 1.23      | `ScrcpyOptions1_23` |
| 1.24      | `ScrcpyOptions1_24` |

When using `AdbScrcpyClient`, there is another `AdbScrcpyOptions` contains `@yume-chan/adb` related logics:

| Version   | Type                   |
| --------- | ---------------------- |
| 1.16~1.21 | `AdbScrcpyOptions1_16` |
| 1.22~1.24 | `AdbScrcpyOptions1_22` |

## Use with `@yume-chan/adb`

The the server binary needs to be copied to the device and run on it.

### Push server binary

The `Adb#sync()#write()` method can be used to push files to the device. Read more at `@yume-chan/adb`'s documentation (https://github.com/yume-chan/ya-webadb/tree/main/libraries/adb#readme).

This package also provides the `AdbScrcpyClient.pushServer()` static method as a shortcut, plus it will automatically close the `AdbSync` object on completion.

Example using `write()`:

```ts
import { AdbScrcpyClient } from '@yume-chan/scrcpy';

const stream: WritableStream<Uint8Array> = AdbScrcpyClient.pushServer(adb);
const writer = stream.getWriter();
await writer.write(new Uint8Array(buffer));
await writer.close();
```

Example using `pipeTo()`:

```ts
import { WrapReadableStream } from '@yume-chan/adb';
import { AdbScrcpyClient } from '@yume-chan/scrcpy';

await fetch(SCRCPY_SERVER_URL)
    // `WrapReadableStream` is required because native `ReadableStream` (from `fetch`)
    // doesn't support `pipeTo()` non-native `WritableStream`s
    // (`@yume-chan/adb` is using `web-streams-polyfill`)
    .then(response => new WrapReadableStream(response.body))
    .then(stream => stream.pipeTo(AdbScrcpyClient.pushServer(adb)));
```

### Start server on device

To start the server, use the `AdbScrcpyClient.start()` method. It automatically sets up port forwarding, launches the server, and connects to it.

```js
import { AdbScrcpyClient, AdbScrcpyOptions1_22, DEFAULT_SERVER_PATH, ScrcpyOptions1_24 } from '@yume-chan/scrcpy';
import SCRCPY_SERVER_VERSION from '@yume-chan/scrcpy/bin/version.js';

const client: AdbScrcpyClient = await AdbScrcpyClient.start(
    adb,
    DEFAULT_SERVER_PATH,
    SCRCPY_SERVER_VERSION, // Or provide your own version number
    new AdbScrcpyOptions1_22(ScrcpyOptions1_24({
        // options
    }))
);

const stdout: ReadableStream<string> = client.stdout;
const videoPacketStream: ReadableStream<ScrcpyVideoStreamPacket> = client.videoStream;
const controlMessageSerializer: ScrcpyControlMessageSerializer | undefined = client.controlMessageSerializer;
const deviceMessageStream: ReadableStream<ScrcpyDeviceMessage> | undefined = client.deviceMessageStream;

// to stop the server
client.close();
```

## Using other transportation

If you push, start and connect to the server yourself, you can still use this package to serialize/deserialize packets.

### Parsing video packets

Requires a `ReadableStream<Uint8Array>` that reads from the video socket, preserving packet boundaries.

```ts
import { ScrcpyOptions1_24, ScrcpyVideoStreamPacket } from '@yume-chan/scrcpy';

const videoStream: ReadableStream<Uint8Array>; // get the stream yourself

const options = new ScrcpyOptions1_24({
    // use the same version and options
});

const videoPacketStream: ReadableStream<ScrcpyVideoStreamPacket> = videoStream.pipeThrough(options.createVideoStreamTransformer());
// Read from `videoPacketStream`
```

### Sending control messages

Requires a `WritableStream<Uint8Array>` that writes to the control socket.

Control socket is optional if control is not enabled. Video socket and control socket can run completely separately.

```ts
import { ScrcpyControlMessageSerializer, ScrcpyOptions1_24 } from '@yume-chan/scrcpy';

const controlStream: ReadableWritablePair<Uint8Array, Uint8Array> | undefined // get the stream yourself

const options = new ScrcpyOptions1_24({
    // use the same version and options
});

const controlMessageSerializer = new ScrcpyControlMessageSerializer(controlStream.writable, options);
// Call methods on `controlMessageSerializer`
controlMessageSerializer.injectText("Hello World!");
```

### Reading device messages

Requires a `ReadableStream<Uint8Array>` that reads from the control socket.

```ts
import { ScrcpyDeviceMessageDeserializeStream, ScrcpyOptions1_24 } from '@yume-chan/scrcpy';

const controlStream: ReadableWritablePair<Uint8Array, Uint8Array> | undefined // get the stream yourself

const deviceMessageStream: ReadableStream<ScrcpyDeviceMessage> = controlStream.readable.pipeThrough(new ScrcpyDeviceMessageDeserializeStream());
```

## Consume the streams

Any `ReadableStream` (`stdout` when using `AdbScrcpyClient`, `videoPacketStream` and `deviceMessageStream` when control is enabled) must be continuously read (even if you don't care about the data), otherwise the whole connection will stall.

```ts
// when using `AdbScrcpyClient`
stdout
    .pipeTo(
        new WritableStream<string>({
            write: (line) => {
                // Handle the stdout line
            },
        }),
    )
    .catch(() => {})
    .then(() => {
        // Handle server exit
    });

videoPacketStream
    .pipeTo(new WritableStream<ScrcpyVideoStreamPacket>({
        write: (packet) => {
            // Handle the video packet
        },
    }))
    .catch(() => {});

deviceMessageStream
    .pipeTo(new WritableStream<ScrcpyDeviceMessage>({
        write: (message) => {
            // Handle the device message
        },
    }))
    .catch(() => {});
```

## Video stream

The data from `videoPacketStream` has two types: `configuration` and `frame`. Some fields may not be populated depending on the server version and options.

```ts
export interface ScrcpyVideoStreamConfigurationPacket {
    type: 'configuration';
    data: H264Configuration;
}

export interface ScrcpyVideoStreamFramePacket {
    type: 'frame';
    keyframe?: boolean | undefined;
    pts?: bigint | undefined;
    data: Uint8Array;
}
```

When `sendFrameMeta: false` is set, `videoPacketStream` only contains `frame` packets, and only the `data` field in it is available. It's commonly used when feeding into decoders like FFmpeg that can parse the H.264 stream itself, or saving to disk directly.

Otherwise, both `configuration` and `frame` packets are available.

* `configuration` packets contain the parsed SPS data, and can be used to initialize a video decoder.
* `pts` (and `keyframe` field from server version 1.23) fields in `frame` packets are available to help decode the video.

## Decode video stream

`@yume-chan/scrcpy-decoder-tinyh264` and `@yume-chan/scrcpy-decoder-webcodecs` can be used to decode and render the video stream in Browser environments. Refer to their README files for compatibility and usage information.
