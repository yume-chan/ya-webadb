import type { Adb, AdbSubprocessProtocol } from "@yume-chan/adb";
import {
    AdbReverseNotSupportedError,
    AdbSubprocessNoneProtocol,
} from "@yume-chan/adb";
import type {
    Consumable,
    ReadableStream,
    ReadableWritablePair,
} from "@yume-chan/stream-extra";
import {
    AbortController,
    DecodeUtf8Stream,
    InspectStream,
    PushReadableStream,
    SplitStringStream,
    WritableStream,
} from "@yume-chan/stream-extra";

import { ScrcpyControlMessageSerializer } from "../control/index.js";
import type { ScrcpyDeviceMessage } from "../device-message/index.js";
import { ScrcpyDeviceMessageDeserializeStream } from "../device-message/index.js";
import type {
    ScrcpyOptionsInit1_16,
    ScrcpyVideoStreamPacket,
} from "../options/index.js";
import { DEFAULT_SERVER_PATH } from "../options/index.js";

import type { AdbScrcpyConnection } from "./connection.js";
import type { AdbScrcpyOptions } from "./options/index.js";

function arrayToStream<T>(array: T[]): ReadableStream<T> {
    return new PushReadableStream(async (controller) => {
        for (const item of array) {
            await controller.enqueue(item);
        }
    });
}

function concatStreams<T>(...streams: ReadableStream<T>[]): ReadableStream<T> {
    return new PushReadableStream(async (controller) => {
        for (const stream of streams) {
            await stream.pipeTo(
                new WritableStream({
                    async write(chunk) {
                        await controller.enqueue(chunk);
                    },
                })
            );
        }
    });
}

export class ScrcpyExitedError extends Error {
    public output: string[];

    public constructor(output: string[]) {
        super("scrcpy server exited prematurely");
        this.output = output;
    }
}

export class AdbScrcpyClient {
    public static async pushServer(
        adb: Adb,
        file: ReadableStream<Consumable<Uint8Array>>,
        filename = DEFAULT_SERVER_PATH
    ) {
        const sync = await adb.sync();
        try {
            await sync.write({
                filename,
                file,
            });
        } finally {
            await sync.dispose();
        }
    }

    public static async start(
        adb: Adb,
        path: string,
        version: string,
        options: AdbScrcpyOptions<ScrcpyOptionsInit1_16>
    ) {
        let connection: AdbScrcpyConnection | undefined;
        let process: AdbSubprocessProtocol | undefined;

        try {
            try {
                connection = options.createConnection(adb);
                await connection.initialize();
            } catch (e) {
                if (e instanceof AdbReverseNotSupportedError) {
                    // When reverse tunnel is not supported, try forward tunnel.
                    options.value.tunnelForward = true;
                    connection = options.createConnection(adb);
                    await connection.initialize();
                } else {
                    connection = undefined;
                    throw e;
                }
            }

            process = await adb.subprocess.spawn(
                [
                    // cspell: disable-next-line
                    `CLASSPATH=${path}`,
                    "app_process",
                    /* unused */ "/",
                    "com.genymobile.scrcpy.Server",
                    version,
                    ...options.formatServerArguments(),
                ],
                {
                    // Scrcpy server doesn't use stderr,
                    // so disable Shell Protocol to simplify processing
                    protocols: [AdbSubprocessNoneProtocol],
                }
            );

            const stdout = process.stdout
                .pipeThrough(new DecodeUtf8Stream())
                .pipeThrough(new SplitStringStream("\n"));

            // Read stdout, otherwise `process.exit` won't resolve.
            const output: string[] = [];
            const abortController = new AbortController();
            const pipe = stdout
                .pipeTo(
                    new WritableStream({
                        write(chunk) {
                            output.push(chunk);
                        },
                    }),
                    {
                        signal: abortController.signal,
                        preventCancel: true,
                    }
                )
                .catch((e) => {
                    void e;
                });

            const result = await Promise.race([
                process.exit,
                connection.getStreams(),
            ]);

            if (typeof result === "number") {
                throw new ScrcpyExitedError(output);
            }

            abortController.abort();
            await pipe;

            const [videoStream, controlStream] = result;
            return new AdbScrcpyClient(
                options,
                process,
                concatStreams(arrayToStream(output), stdout),
                videoStream,
                controlStream
            );
        } catch (e) {
            await process?.kill();
            throw e;
        } finally {
            connection?.dispose();
        }
    }

    /**
     * This method will modify the given `options`,
     * so don't reuse it elsewhere.
     */
    public static async getEncoders(
        adb: Adb,
        path: string,
        version: string,
        options: AdbScrcpyOptions<ScrcpyOptionsInit1_16>
    ): Promise<string[]> {
        Object.assign(options.value, {
            // Provide an invalid encoder name
            // So the server will return all available encoders
            encoderName: "_",
            // Disable control for faster connection in 1.22+
            control: false,
            sendDeviceMeta: false,
            sendDummyByte: false,
        });

        // Scrcpy server will open connections, before initializing encoder
        // Thus although an invalid encoder name is given, the start process will success
        const client = await AdbScrcpyClient.start(adb, path, version, options);

        const encoderNameRegex = options.getOutputEncoderNameRegex();
        const encoders: string[] = [];
        await client.stdout.pipeTo(
            new WritableStream({
                write(line) {
                    const match = line.match(encoderNameRegex);
                    if (match) {
                        encoders.push(match[1]!);
                    }
                },
            })
        );

        return encoders;
    }

    /**
     * This method will modify the given `options`,
     * so don't reuse it elsewhere.
     */
    public static async getDisplays(
        adb: Adb,
        path: string,
        version: string,
        options: AdbScrcpyOptions<ScrcpyOptionsInit1_16>
    ): Promise<number[]> {
        Object.assign(options.value, {
            // Similar to `getEncoders`, pass an invalid option and parse the output
            displayId: -1,
            // Disable control for faster connection in 1.22+
            control: false,
            sendDeviceMeta: false,
            sendDummyByte: false,
        });

        try {
            // Server will exit before opening connections when an invalid display id was given.
            await AdbScrcpyClient.start(adb, path, version, options);
        } catch (e) {
            if (e instanceof ScrcpyExitedError) {
                const displayIdRegex = /\s+scrcpy --display (\d+)/;
                const displays: number[] = [];
                for (const line of e.output) {
                    const match = line.match(displayIdRegex);
                    if (match) {
                        displays.push(Number.parseInt(match[1]!, 10));
                    }
                }
                return displays;
            }
        }

        throw new Error("failed to get displays");
    }

    private process: AdbSubprocessProtocol;

    private _stdout: ReadableStream<string>;
    public get stdout() {
        return this._stdout;
    }

    public get exit() {
        return this.process.exit;
    }

    private _screenWidth: number | undefined;
    public get screenWidth() {
        return this._screenWidth;
    }

    private _screenHeight: number | undefined;
    public get screenHeight() {
        return this._screenHeight;
    }

    private _videoStream: ReadableStream<ScrcpyVideoStreamPacket>;
    public get videoStream() {
        return this._videoStream;
    }

    private _controlMessageSerializer:
        | ScrcpyControlMessageSerializer
        | undefined;
    public get controlMessageSerializer() {
        return this._controlMessageSerializer;
    }

    private _deviceMessageStream:
        | ReadableStream<ScrcpyDeviceMessage>
        | undefined;
    public get deviceMessageStream() {
        return this._deviceMessageStream;
    }

    public constructor(
        options: AdbScrcpyOptions<ScrcpyOptionsInit1_16>,
        process: AdbSubprocessProtocol,
        stdout: ReadableStream<string>,
        videoStream: ReadableStream<Uint8Array>,
        controlStream:
            | ReadableWritablePair<Uint8Array, Consumable<Uint8Array>>
            | undefined
    ) {
        this.process = process;
        this._stdout = stdout;

        this._videoStream = videoStream
            .pipeThrough(options.createVideoStreamTransformer())
            .pipeThrough(
                new InspectStream((packet) => {
                    if (packet.type === "configuration") {
                        this._screenWidth = packet.data.croppedWidth;
                        this._screenHeight = packet.data.croppedHeight;
                    }
                })
            );

        if (controlStream) {
            this._controlMessageSerializer = new ScrcpyControlMessageSerializer(
                controlStream.writable,
                options
            );
            this._deviceMessageStream = controlStream.readable.pipeThrough(
                new ScrcpyDeviceMessageDeserializeStream()
            );
        }
    }

    public async close() {
        await this.process.kill();
    }
}
