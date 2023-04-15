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
    AdbScrcpyOptions2_0,
    DEFAULT_SERVER_PATH,
    ScrcpyOptions2_0,
} from "@yume-chan/scrcpy";
import SCRCPY_SERVER_VERSION from "@yume-chan/scrcpy/bin/version.js";

const client: AdbScrcpyClient = await AdbScrcpyClient.start(
    adb,
    DEFAULT_SERVER_PATH,
    // If server binary was downloaded manually, must provide the correct version
    SCRCPY_SERVER_VERSION,
    new AdbScrcpyOptions2_0(
        ScrcpyOptions2_0({
            // options
        })
    )
);

const stdout: ReadableStream<string> = client.stdout;
const { metadata: videoMetadata, stream: videoPacketStream } =
    await client.videoStream;
const { metadata: audioMetadata, stream: audioPacketStream } =
    await client.audioStream;
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
