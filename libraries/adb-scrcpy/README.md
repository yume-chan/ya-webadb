# @yume-chan/adb-scrcpy

Use `@yume-chan/adb` to bootstrap `@yume-chan/scrcpy`.

**WARNING:** The public API is UNSTABLE. Open a GitHub discussion if you have any questions.

-   [Prerequisites](#prerequisites)
-   [Server versions](#server-versions)
    -   [Push server binary](#push-server-binary)
    -   [Start server on device](#start-server-on-device)
-   [Always read all streams](#always-read-all-streams)

## Prerequisites

See `@yume-chan/scrcpy`'s README for introduction and prerequisites.

## Server versions

Similar to `@yume-chan/scrcpy`, this package supports multiple Scrcpy versions, but requires correct options for each version.

| Version   | Type                   |
| --------- | ---------------------- |
| 1.16~1.21 | `AdbScrcpyOptions1_16` |
| 1.22~1.25 | `AdbScrcpyOptions1_22` |
| 2.0       | `AdbScrcpyOptions2_0`  |
| 2.1       | `AdbScrcpyOptions2_1`  |

### Push server binary

The `AdbSync#write()` method can be used to push files to the device. Read more at `@yume-chan/adb`'s documentation (https://github.com/yume-chan/ya-webadb/tree/main/libraries/adb#readme).

This package also provides the `AdbScrcpyClient.pushServer()` static method as a shortcut, plus it will automatically close the `AdbSync` object on completion.

Example using a `ReadableStream`:

```ts
import { WrapReadableStream } from "@yume-chan/adb";
import { AdbScrcpyClient } from "@yume-chan/scrcpy";
import {
    WrapReadableStream,
    WrapConsumableStream,
} from "@yume-chan/stream-extra";

const response = await fetch(SCRCPY_SERVER_URL);
await AdbScrcpyClient.pushServer(
    adb,
    new WrapReadableStream(response.body).pipeThrough(
        new WrapConsumableStream()
    )
);
```

Example using an `ArrayBuffer`:

```ts
import { AdbScrcpyClient } from "@yume-chan/scrcpy";
import { Consumable, ReadableStream } from "@yume-chan/stream-extra";

await AdbScrcpyClient.pushServer(
    adb,
    new ReadableStream<Consumable<Uint8Array>>({
        start(controller) {
            controller.enqueue(new Consumable(serverBuffer));
            controller.close();
        },
    })
);
```

### Start server on device

To start the server, use the `AdbScrcpyClient.start()` method. It automatically sets up port forwarding, launches the server, and connects to it.

```js
import {
    AdbScrcpyClient,
    AdbScrcpyOptions2_1,
    DEFAULT_SERVER_PATH,
    ScrcpyOptions2_1,
} from "@yume-chan/scrcpy";
import SCRCPY_SERVER_VERSION from "@yume-chan/scrcpy/bin/version.js";

const client: AdbScrcpyClient = await AdbScrcpyClient.start(
    adb,
    DEFAULT_SERVER_PATH,
    // If server binary was downloaded manually, must provide the correct version
    SCRCPY_SERVER_VERSION,
    new AdbScrcpyOptions2_1(
        ScrcpyOptions2_1({
            // options
        })
    )
);

const stdout: ReadableStream<string> = client.stdout;

// `undefined` if `video: false` option was given
if (client.videoSteam) {
    const { metadata: videoMetadata, stream: videoPacketStream } =
        await client.videoStream;
}

// `undefined` if `audio: false` option was given
if (client.audioStream) {
    const metadata = await client.audioStream;
    switch (metadata.type) {
        case "disabled":
            // Audio not supported by device
            break;
        case "errored":
            // Other error when initializing audio
            break;
        case "success":
            // Audio packets in the codec specified in options
            const audioPacketStream: ReadableStream<ScrcpyMediaStreamPacket> =
                metadata.stream;
            break;
    }
}

// `undefined` if `control: false` option was given
const controlMessageWriter: ScrcpyControlMessageWriter | undefined =
    client.controlMessageWriter;
const deviceMessageStream: ReadableStream<ScrcpyDeviceMessage> | undefined =
    client.deviceMessageStream;

// to stop the server
client.close();
```

## Always read all streams

In Web Streams API, pipes will block its upstream when downstream's queue is full (back-pressure mechanism). If multiple streams are separated from the same source (for example, all Scrcpy streams are from the same USB or TCP connection), blocking one stream means blocking all of them, so it's important to always read from all streams, even if you don't care about their data.

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
        new WritableStream<ScrcpyMediaStreamPacket>({
            write: (packet) => {
                // Handle or ignore the video packet
            },
        })
    )
    .catch(() => {});

audioPacketStream
    .pipeTo(
        new WritableStream<ScrcpyMediaStreamPacket>({
            write: (packet) => {
                // Handle or ignore the audio packet
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
