# @yume-chan/scrcpy

TypeScript library to communicate with [Scrcpy](https://github.com/Genymobile/scrcpy) server.

It's compatible with the official Scrcpy server binaries.

**WARNING:** The public API is UNSTABLE. Open a GitHub discussion if you have any questions.

-   [How does Scrcpy work](#how-does-scrcpy-work)
-   [What does this package do](#what-does-this-package-do)
-   [Prepare server binary](#prepare-server-binary)
    -   [`fetch-scrcpy-server`](#fetch-scrcpy-server)
    -   [Use the server binary](#use-the-server-binary)
        -   [Node.js CommonJS](#nodejs-commonjs)
        -   [Node.js ES module](#nodejs-es-module)
        -   [Webpack 4](#webpack-4)
        -   [Webpack 5](#webpack-5)
-   [Server versions](#server-versions)
-   [Reading and writing packets](#reading-and-writing-packets)
    -   [Reading video/audio packets](#reading-videoaudio-packets)
    -   [Sending control messages](#sending-control-messages)
    -   [Reading device messages](#reading-device-messages)
-   [Always read all streams](#always-read-all-streams)
-   [Video/audio stream](#videoaudio-stream)
-   [Decode video stream](#decode-video-stream)

## How does Scrcpy work

Scrcpy has two parts: a client and a server.

The server is a Java application (but not an Android app) that runs on the device to capture the video and audio, and send them to the client.

The client receives captured video and audio data, and renders them on computer.

The official Scrcpy client also spawns Google ADB executable to set up the reverse tunnel, push the server binary to the device, and start the server.

## What does this package do

This package can't push nor start the server, nor render the video and audio. It only provides APIs to communicate with the server.

`@yume-chan/adb-scrcpy` package is a wrapper of this package, provides integration with `@yume-chan/adb` package, and can push, start, and stop the server.

## Prepare server binary

This package is compatible with many versions of the official server binary, but it doesn't include the server binary itself.

You can download the server binary from official releases (https://github.com/Genymobile/scrcpy/releases), or use the included `fetch-scrcpy-server` script to automate the process.

The server binary is subject to [Apache License 2.0](https://github.com/Genymobile/scrcpy/blob/master/LICENSE).

### `fetch-scrcpy-server`

This script downloads the server binary from official releases for you.

Before using this script, install `gh-release-fetch@3` package separately:

```sh
npm install --save-dev gh-release-fetch@3
```

Usage:

```
npx fetch-scrcpy-server <version>
```

For example:

```
npx fetch-scrcpy-server 1.25
```

Add it to `scripts.postinstall` in your `package.json`, so running `npm install` automatically invokes the script:

```json
{
    "scripts": {
        "postinstall": "fetch-scrcpy-server 1.25"
    }
}
```

The server binary will be saved to `bin/scrcpy-server` in this package's installation directory (usually in `node_modules`).

It will also save the version number to `bin/version.js`.

```js
import SCRCPY_SERVER_VERSION from "@yume-chan/scrcpy/bin/version.js";

console.log(SCRCPY_SERVER_VERSION); // "1.25"
```

### Use the server binary

The server binary file needs to be embedded into your application, the exact method depends on the bundler and runtime.

To name a few:

#### Node.js CommonJS

```ts
const fs = require("fs");
const path: string = require.resolve("@yume-chan/scrcpy/bin/scrcpy-server"); // Or your own server binary path
const buffer: Buffer = fs.readFileSync(path);
```

#### Node.js ES module

Without the `import.meta.resolve` feature:

```ts
import fs from "node:fs/promises";
import { createRequire } from "node:module";

const path: string = createRequire(import.meta.url).resolve(
    "@yume-chan/scrcpy/bin/scrcpy-server"
); // Or your own server binary path
const buffer: Buffer = await fs.readFile(path);
```

With `import.meta.resolve` feature (requires `--experimental-import-meta-resolve` command line flag for Node.js 12.6.0+):

```ts
import fs from "node:fs/promises";

const path: string = await import.meta.resolve(
    "@yume-chan/scrcpy/bin/scrcpy-server"
);
const buffer: Buffer = await fs.readFile(path);
```

#### Webpack 4

Requires installing and configuring file-loader (https://v4.webpack.js.org/loaders/file-loader/)

```ts
import SCRCPY_SERVER_URL from "@yume-chan/scrcpy/bin/scrcpy-server"; // Or your own server binary path
const buffer: ArrayBuffer = await fetch(SCRCPY_SERVER_URL).then((response) =>
    response.arrayBuffer()
);
```

#### Webpack 5

Requires configuring Asset Modules (https://webpack.js.org/guides/asset-modules/)

```ts
const SCRCPY_SERVER_URL = new URL(
    "@yume-chan/scrcpy/bin/scrcpy-server",
    import.meta.url
); // Or your own server binary path
const buffer: ArrayBuffer = await fetch(SCRCPY_SERVER_URL).then((response) =>
    response.arrayBuffer()
);
```

## Server versions

Scrcpy protocol changes over time, and are usually not backwards compatible. This package supports multiple server versions (ranges), and uses different option types to choose different behaviors. Using incorrect option version usually results in errors.

The latest one may continue to work for future server versions, but there is no guarantee.

| Version   | Type                |
| --------- | ------------------- |
| 1.16      | `ScrcpyOptions1_16` |
| 1.17      | `ScrcpyOptions1_17` |
| 1.18~1.20 | `ScrcpyOptions1_18` |
| 1.21      | `ScrcpyOptions1_21` |
| 1.22      | `ScrcpyOptions1_22` |
| 1.23      | `ScrcpyOptions1_23` |
| 1.24      | `ScrcpyOptions1_24` |
| 1.25      | `ScrcpyOptions1_25` |
| 2.0       | `ScrcpyOptions2_0`  |

## Reading and writing packets

This packets operates on Web Streams API streams.

**NOTE:** Web Streams API streams usually can't pipe between different implementations. This package by default uses the native implementation on `globalThis`, and `web-streams-polyfill` otherwise. If you are using another implementation, or simply not sure, wrap your streams using the `WrapReadableStream` and `WrapWritableStream` types from `@yume-chan/stream-extra` package.

### Reading video/audio packets

Requires a `ReadableStream<Uint8Array>` that reads from the video socket.

```ts
import { ScrcpyOptions1_25, ScrcpyVideoStreamPacket } from "@yume-chan/scrcpy";

const options = new ScrcpyOptions1_25({
    // use the same version and options when starting the server
});

const videoStream: ReadableStream<Uint8Array>; // get the stream yourself

// Parse video socket metadata
// Use `videoStream2` instead of `videoStream` from now on
const { metadata, stream: videoStream2 } =
    await options.parseVideoStreamMetadata(videoStream);

const videoPacketStream: ReadableStream<ScrcpyMediaStreamPacket> =
    videoStream2.pipeThrough(options.createMediaStreamTransformer());
// Read from `videoPacketStream`
```

Read audio stream is similar, but uses `parseVideoStreamMetadata` instead.

### Sending control messages

Requires a `WritableStream<Uint8Array>` that writes to the control socket.

Control socket is optional if control is not enabled. Video socket and control socket can run completely separately.

```ts
import {
    ScrcpyControlMessageWriter,
    ScrcpyOptions1_25,
} from "@yume-chan/scrcpy";

const options = new ScrcpyOptions1_25({
    // use the same version and options when starting the server
});

const controlStream: ReadableWritablePair<Uint8Array, Uint8Array>; // get the stream yourself

const controlMessageWriter = new ScrcpyControlMessageWriter(
    controlStream.writable.getWriter(),
    options
);

// Call methods on `controlMessageWriter`
controlMessageWriter.injectText("Hello World!");
```

### Reading device messages

Requires a `ReadableStream<Uint8Array>` that reads from the control socket.

```ts
import {
    ScrcpyDeviceMessageDeserializeStream,
    ScrcpyOptions1_24,
} from "@yume-chan/scrcpy";

const controlStream: ReadableWritablePair<Uint8Array, Uint8Array>; // get the stream yourself

const deviceMessageStream: ReadableStream<ScrcpyDeviceMessage> =
    controlStream.readable.pipeThrough(
        new ScrcpyDeviceMessageDeserializeStream()
    );
```

## Always read all streams

In Web Streams API, pipes will block its upstream when downstream's queue is full (back-pressure mechanism). If multiple streams are separated from the same source (for example, all Scrcpy streams are from the same USB or TCP connection), blocking one stream means blocking all of them, so it's important to always read from all streams, even if you don't care about their data.

```ts
// when using `AdbScrcpyClient`
stdout
    .pipeTo(
        new WritableStream<string>({
            write: (line) => {
                // Handle or ignore the stdout line
            },
        })
    )
    .catch(() => {})
    .then(() => {
        // Handle server exit
    });

videoPacketStream
    .pipeTo(
        new WritableStream<ScrcpyVideoStreamPacket>({
            write: (packet) => {
                // Handle or ignore the video packet
            },
        })
    )
    .catch(() => {});

deviceMessageStream
    .pipeTo(
        new WritableStream<ScrcpyDeviceMessage>({
            write: (message) => {
                // Handle or ignore the device message
            },
        })
    )
    .catch(() => {});
```

## Video/audio stream

The data from `createMediaStreamTransformer()` has two types: `configuration` and `data`.

```ts
export interface ScrcpyMediaStreamConfigurationPacket {
    type: "configuration";
    data: Uint8Array;
}

export interface ScrcpyMediaStreamDataPacket {
    type: "data";
    keyframe?: boolean;
    pts?: bigint;
    data: Uint8Array;
}
```

When `sendFrameMeta: false` is set, there will be no `configuration` packets, and no `keyframe` and `pts` fields in `data` packets. It's commonly used with decoders that can parse the media stream itself like FFmpeg, or saved unprocessed.

Otherwise, both `configuration` and `data` packets are available.

-   `configuration` packet will be the first packet, and contains codec information. It will occasionally be sent again if the stream configuration changes.
-   `pts` (and `keyframe` field from server version 1.23) fields in `data` packets are available to help decode the stream.

## Decode video stream

`@yume-chan/scrcpy-decoder-tinyh264` and `@yume-chan/scrcpy-decoder-webcodecs` can be used to decode and render the video stream in browsers. Refer to their README files for compatibility and usage information.
