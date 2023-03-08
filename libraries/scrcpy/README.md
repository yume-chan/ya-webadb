# @yume-chan/scrcpy

TypeScript implementation of [Scrcpy](https://github.com/Genymobile/scrcpy) client.

It's compatible with the official Scrcpy server binaries.

**WARNING:** The public API is UNSTABLE. If you have any questions, please open an issue.

- [Basic information](#basic-information)
- [Prepare server binary](#prepare-server-binary)
  - [`fetch-scrcpy-server`](#fetch-scrcpy-server)
  - [Use the server binary](#use-the-server-binary)
    - [Node.js CommonJS](#nodejs-commonjs)
    - [Node.js ES module](#nodejs-es-module)
    - [Webpack 4](#webpack-4)
    - [Webpack 5](#webpack-5)
  - [Read the server version](#read-the-server-version)
- [Server versions](#server-versions)
- [Use with `@yume-chan/adb`](#use-with-yume-chanadb)
  - [Push server binary](#push-server-binary)
  - [Start server on device](#start-server-on-device)
- [Using other transportation](#using-other-transportation)
  - [Parsing video packets](#parsing-video-packets)
  - [Sending control messages](#sending-control-messages)
  - [Reading device messages](#reading-device-messages)
- [Always read the streams](#always-read-the-streams)
- [Video stream](#video-stream)
- [Decode video stream](#decode-video-stream)

## Basic information

Although Scrcpy doesn't install any App on the device, it does have a server binary executable to be run on the device.

With the official Scrcpy client and server, the client uses ADB to transfer the server binary file to the device, run it, and communicate with it via ADB tunnel (the bootstrap process).

This package provides types that can serialize and deserialize Scrcpy protocol messages, but it generally requires you to do the bootstrapping and provide the data stream to the server.

If you are also using `@yume-chan/adb`, this package has a helper class that can complete the bootstrap process using it, doing what the official client does.

**NOTE:** `@yume-chan/adb` is a peer dependency, you need to install it yourself. Only those types whose names begin with `Adb` requires `@yume-chan/adb`.

## Prepare server binary

This package doesn't include the server binary. It's compatible with many versions of the official server binary, but may not work with future versions due to protocol changes.

You can download the server binary from official releases (https://github.com/Genymobile/scrcpy/releases), or use the built-in `fetch-scrcpy-server` script to automate the process.

The server binary is subject to [Apache License 2.0](https://github.com/Genymobile/scrcpy/blob/master/LICENSE).

### `fetch-scrcpy-server`

This package includes a script that downloads the server binary from official releases for you.

The `gh-release-fetch@3` package is a peer dependency for this script, thus requires separated installation.

Usage:

```
$ npx fetch-scrcpy-server <version>
```

For example:

```
$ npx fetch-scrcpy-server 1.25
```

It can also be added to the `postinstall` script in `package.json`, so running `npm install` will automatically invoke the script:

```json
"scripts": {
    "postinstall": "fetch-scrcpy-server 1.25",
},
```

The server binary will be named `bin/scrcpy-server` in this package's installation directory (usually in `node_modules`).

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

```ts
import fs from "node:fs/promises";
import { createRequire } from "node:module";

const path: string = createRequire(import.meta.url).resolve(
    "@yume-chan/scrcpy/bin/scrcpy-server"
); // Or your own server binary path
const buffer: Buffer = await fs.readFile(path);
```

Currently, ES Module doesn't have a `resolve` function like `require.resolve` in CommonJS, so `createRequire` is used to create a CommonJS resolver.

Or with the `--experimental-import-meta-resolve` command line flag, you can use `import.meta.resolve`:

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

### Read the server version

The correct version number is required to launch the server, so `fetch-scrcpy-server` also writes the version number to `bin/version.js`.

```js
import SCRCPY_SERVER_VERSION from "@yume-chan/scrcpy/bin/version.js";

console.log(SCRCPY_SERVER_VERSION); // "1.25"
```

## Server versions

Scrcpy protocol change over time, and are usually not backwards compatible. This package supports multiple server versions (or ranges), and uses different option types to choose different behaviors. Using incorrect option version usually results in errors.

The latest one may continue to work for future server versions, but there is no guarantee.

| Version   | Type                |
| --------- | ------------------- |
| 1.16~1.17 | `ScrcpyOptions1_16` |
| 1.18~1.20 | `ScrcpyOptions1_18` |
| 1.21      | `ScrcpyOptions1_21` |
| 1.22      | `ScrcpyOptions1_22` |
| 1.23      | `ScrcpyOptions1_23` |
| 1.24      | `ScrcpyOptions1_24` |
| 1.25      | `ScrcpyOptions1_25` |

When using `AdbScrcpyClient`, there are `AdbScrcpyOptions` containing `@yume-chan/adb` specific options:

| Version   | Type                   |
| --------- | ---------------------- |
| 1.16~1.21 | `AdbScrcpyOptions1_16` |
| 1.22~1.25 | `AdbScrcpyOptions1_22` |

## Use with `@yume-chan/adb`

`@yume-chan/adb` is a TypeScript ADB implementation that can run on Web browser. It can be used to bootstrap the server on a device.

### Push server binary

The `AdbSync#write()` method can be used to push files to the device. Read more at `@yume-chan/adb`'s documentation (https://github.com/yume-chan/ya-webadb/tree/main/libraries/adb#readme).

This package also provides the `AdbScrcpyClient.pushServer()` static method as a shortcut, plus it will automatically close the `AdbSync` object on completion.

Example using a `ReadableStream`:

```ts
import { WrapReadableStream } from "@yume-chan/adb";
import { AdbScrcpyClient } from "@yume-chan/scrcpy";

await AdbScrcpyClient.pushServer(
    adb,
    await fetch(SCRCPY_SERVER_URL).then(
        // `WrapReadableStream` is required because native `ReadableStream` (from `fetch`)
        // doesn't support `pipeTo()` non-native `WritableStream`s
        // (`@yume-chan/adb` is using `web-streams-polyfill`)
        (response) => new WrapReadableStream(response.body)
    )
);
```

Example using an `ArrayBuffer`:

```ts
import { AdbScrcpyClient } from "@yume-chan/scrcpy";

await AdbScrcpyClient.pushServer(
    adb,
    new ReadableStream({
        start(controller) {
            controller.enqueue(new Uint8Array(buffer));
            controller.end();
        },
    })
);
```

### Start server on device

To start the server, use the `AdbScrcpyClient.start()` method. It automatically sets up port forwarding, launches the server, and connects to it.

```js
import {
    AdbScrcpyClient,
    AdbScrcpyOptions1_22,
    DEFAULT_SERVER_PATH,
    ScrcpyOptions1_24,
} from "@yume-chan/scrcpy";
import SCRCPY_SERVER_VERSION from "@yume-chan/scrcpy/bin/version.js";

const client: AdbScrcpyClient = await AdbScrcpyClient.start(
    adb,
    DEFAULT_SERVER_PATH,
    // If server binary was downloaded manually, must provide the correct version
    SCRCPY_SERVER_VERSION,
    new AdbScrcpyOptions1_22(
        ScrcpyOptions1_24({
            // options
        })
    )
);

const stdout: ReadableStream<string> = client.stdout;
const videoPacketStream: ReadableStream<ScrcpyVideoStreamPacket> =
    client.videoStream;
const controlMessageSerializer: ScrcpyControlMessageSerializer | undefined =
    client.controlMessageSerializer;
const deviceMessageStream: ReadableStream<ScrcpyDeviceMessage> | undefined =
    client.deviceMessageStream;

// to stop the server
client.close();
```

## Using other transportation

If you push, start and connect to the server yourself, you can still use this package to serialize/deserialize packets.

### Parsing video packets

Requires a `ReadableStream<Uint8Array>` that reads from the video socket, preserving packet boundaries.

**NOTE:** Because this package uses `web-streams-polyfill` NPM package's Web Streams API implementation, the provided `ReadableStream` must also be from `web-streams-polyfill` (or another polyfill that doesn't check object prototype when piping).

```ts
import { ScrcpyOptions1_24, ScrcpyVideoStreamPacket } from "@yume-chan/scrcpy";

const videoStream: ReadableStream<Uint8Array>; // get the stream yourself

const options = new ScrcpyOptions1_24({
    // use the same version and options
});

const videoPacketStream: ReadableStream<ScrcpyVideoStreamPacket> =
    videoStream.pipeThrough(options.createVideoStreamTransformer());
// Read from `videoPacketStream`
```

### Sending control messages

Requires a `WritableStream<Uint8Array>` that writes to the control socket.

Control socket is optional if control is not enabled. Video socket and control socket can run completely separately.

```ts
import {
    ScrcpyControlMessageSerializer,
    ScrcpyOptions1_24,
} from "@yume-chan/scrcpy";

const controlStream: ReadableWritablePair<Uint8Array, Uint8Array> | undefined; // get the stream yourself

const options = new ScrcpyOptions1_24({
    // use the same version and options
});

const controlMessageSerializer = new ScrcpyControlMessageSerializer(
    controlStream.writable,
    options
);
// Call methods on `controlMessageSerializer`
controlMessageSerializer.injectText("Hello World!");
```

### Reading device messages

Requires a `ReadableStream<Uint8Array>` that reads from the control socket.

**NOTE:** Because this package uses `web-streams-polyfill` NPM package's Web Streams API implementation, the provided `ReadableStream` must also be from `web-streams-polyfill` (or another polyfill that doesn't check object prototype when piping).

```ts
import {
    ScrcpyDeviceMessageDeserializeStream,
    ScrcpyOptions1_24,
} from "@yume-chan/scrcpy";

const controlStream: ReadableWritablePair<Uint8Array, Uint8Array> | undefined; // get the stream yourself

const deviceMessageStream: ReadableStream<ScrcpyDeviceMessage> =
    controlStream.readable.pipeThrough(
        new ScrcpyDeviceMessageDeserializeStream()
    );
```

## Always read the streams

In Web Streams API, `ReadableStream` will block its upstream when too many chunks are kept not read. If multiple streams are from the same upstream source, block one stream means blocking all of them.

For Scrcpy, usually all streams are originated from the same ADB connection (either USB or TCP), so it's important to always read from all streams, even if you don't care about their data.

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

## Video stream

The data from `videoPacketStream` has two types: `configuration` and `frame`. Some fields may not be populated depending on the server version and options.

```ts
export interface ScrcpyVideoStreamConfigurationPacket {
    type: "configuration";
    data: H264Configuration;
}

export interface ScrcpyVideoStreamFramePacket {
    type: "frame";
    keyframe?: boolean | undefined;
    pts?: bigint | undefined;
    data: Uint8Array;
}
```

When `sendFrameMeta: false` is set, `videoPacketStream` only contains `frame` packets, and only the `data` field in it is available. It's commonly used when feeding into decoders like FFmpeg that can parse the H.264 stream itself, or saving to disk directly.

Otherwise, both `configuration` and `frame` packets are available.

-   `configuration` packets contain the parsed SPS data, and can be used to initialize a video decoder.
-   `pts` (and `keyframe` field from server version 1.23) fields in `frame` packets are available to help decode the video.

## Decode video stream

`@yume-chan/scrcpy-decoder-tinyh264` and `@yume-chan/scrcpy-decoder-webcodecs` can be used to decode and render the video stream in Browser environments. Refer to their README files for compatibility and usage information.
