# @yume-chan/adb-scrcpy

Use `@yume-chan/adb` to bootstrap `@yume-chan/scrcpy`.

**WARNING:** The public API is UNSTABLE. If you have any questions, please open an issue.

-   [Prerequisites](#prerequisites)
-   [Server versions](#server-versions)
    -   [Push server binary](#push-server-binary)
    -   [Start server on device](#start-server-on-device)
-   [Always read the streams](#always-read-the-streams)
-   [Video stream](#video-stream)

## Prerequisites

See `@yume-chan/scrcpy`'s README for introduction and prerequisites.

## Server versions

| Version   | Type                   |
| --------- | ---------------------- |
| 1.16~1.21 | `AdbScrcpyOptions1_16` |
| 1.22~1.25 | `AdbScrcpyOptions1_22` |
| 2.0       | `AdbScrcpyOptions2_0`  |

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

## Always read the streams

In Web Streams API, `ReadableStream` will block its upstream when too many chunks are kept not read. If multiple streams are from the same upstream source, block one stream means blocking all of them.

For Scrcpy, usually all streams are originated from the same ADB connection (either USB or TCP), so it's important to always read from all streams, even if you don't care about their data.

```ts
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

The data from `videoPacketStream` has two types: `configuration` and `data`. Some fields may not be populated depending on the server version and options.

```ts
export interface ScrcpyVideoStreamConfigurationPacket {
    type: "configuration";
    data: Uint8Array;
}

export interface ScrcpyVideoStreamFramePacket {
    type: "data";
    keyframe?: boolean | undefined;
    pts?: bigint | undefined;
    data: Uint8Array;
}
```

When `sendFrameMeta: false` is set, `videoPacketStream` only contains `frame` packets, and only the `data` field in it is available. It's commonly used when feeding into decoders like FFmpeg that can parse the H.264 stream itself, or saving to disk directly.

Otherwise, both `configuration` and `data` packets are available.

-   `configuration` packets contain the parsed SPS data, and can be used to initialize a video decoder.
-   `pts` (and `keyframe` field from server version 1.23) fields in `data` packets are available to help decode the video.
