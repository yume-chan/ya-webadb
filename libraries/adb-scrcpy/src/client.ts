import type { Adb, AdbSubprocessProtocol } from "@yume-chan/adb";
import {
    AdbReverseNotSupportedError,
    AdbSubprocessNoneProtocol,
} from "@yume-chan/adb";
import type {
    ScrcpyAudioStreamDisabledMetadata,
    ScrcpyAudioStreamErroredMetadata,
    ScrcpyAudioStreamSuccessMetadata,
    ScrcpyDeviceMessage,
    ScrcpyEncoder,
    ScrcpyMediaStreamPacket,
    ScrcpyVideoStreamMetadata,
} from "@yume-chan/scrcpy";
import {
    DEFAULT_SERVER_PATH,
    ScrcpyControlMessageSerializer,
    ScrcpyDeviceMessageDeserializeStream,
    ScrcpyVideoCodecId,
    h264ParseConfiguration,
} from "@yume-chan/scrcpy";
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

import type { AdbScrcpyConnection } from "./connection.js";
import type { AdbScrcpyOptions } from "./options/index.js";

const NOOP = () => {
    // no-op
};

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

export class AdbScrcpyExitedError extends Error {
    public output: string[];

    public constructor(output: string[]) {
        super("scrcpy server exited prematurely");
        this.output = output;
    }
}

interface AdbScrcpyClientInit {
    options: AdbScrcpyOptions<object>;
    process: AdbSubprocessProtocol;
    stdout: ReadableStream<string>;

    videoStream: ReadableStream<Uint8Array>;
    audioStream: ReadableStream<Uint8Array> | undefined;
    controlStream:
        | ReadableWritablePair<Uint8Array, Consumable<Uint8Array>>
        | undefined;
}

export interface AdbScrcpyVideoStream {
    stream: ReadableStream<ScrcpyMediaStreamPacket>;
    metadata: ScrcpyVideoStreamMetadata;
}

export interface AdbScrcpyAudioStreamSuccessMetadata
    extends Omit<ScrcpyAudioStreamSuccessMetadata, "stream"> {
    readonly stream: ReadableStream<ScrcpyMediaStreamPacket>;
}

export type AdbScrcpyAudioStreamMetadata =
    | ScrcpyAudioStreamDisabledMetadata
    | ScrcpyAudioStreamErroredMetadata
    | AdbScrcpyAudioStreamSuccessMetadata;

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
        options: AdbScrcpyOptions<object>
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
                    options.tunnelForwardOverride = true;
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
                    ...options.serialize(),
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
                .catch(NOOP);

            const streams = await Promise.race([
                process.exit.then(() => {
                    throw new AdbScrcpyExitedError(output);
                }),
                connection.getStreams(),
            ]);

            abortController.abort();
            await pipe;

            return new AdbScrcpyClient({
                options,
                process,
                stdout: concatStreams(arrayToStream(output), stdout),
                videoStream: streams.video,
                audioStream: streams.audio,
                controlStream: streams.control,
            });
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
        options: AdbScrcpyOptions<object>
    ): Promise<ScrcpyEncoder[]> {
        options.setListEncoders();

        // Scrcpy server will open connections, before initializing encoder
        // Thus although an invalid encoder name is given, the start process will success
        const client = await AdbScrcpyClient.start(adb, path, version, options);

        const encoders: ScrcpyEncoder[] = [];
        await client.stdout.pipeTo(
            new WritableStream({
                write(line) {
                    const encoder = options.parseEncoder(line);
                    if (encoder) {
                        encoders.push(encoder);
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
        options: AdbScrcpyOptions<object>
    ): Promise<number[]> {
        options.setListDisplays();

        try {
            // Server will exit before opening connections when an invalid display id was given.
            await AdbScrcpyClient.start(adb, path, version, options);
        } catch (e) {
            if (e instanceof AdbScrcpyExitedError) {
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

    private _options: AdbScrcpyOptions<object>;
    private _process: AdbSubprocessProtocol;

    private _stdout: ReadableStream<string>;
    public get stdout() {
        return this._stdout;
    }

    public get exit() {
        return this._process.exit;
    }

    private _screenWidth: number | undefined;
    public get screenWidth() {
        return this._screenWidth;
    }

    private _screenHeight: number | undefined;
    public get screenHeight() {
        return this._screenHeight;
    }

    private _videoStream: Promise<AdbScrcpyVideoStream>;
    public get videoStream() {
        return this._videoStream;
    }

    private _audioStream: Promise<AdbScrcpyAudioStreamMetadata> | undefined;
    public get audioStream() {
        return this._audioStream;
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

    public constructor({
        options,
        process,
        stdout,
        videoStream,
        audioStream,
        controlStream,
    }: AdbScrcpyClientInit) {
        this._options = options;
        this._process = process;
        this._stdout = stdout;

        this._videoStream = this.createVideoStream(videoStream);

        this._audioStream = audioStream
            ? this.createAudioStream(audioStream)
            : undefined;

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

    private async createVideoStream(initialStream: ReadableStream<Uint8Array>) {
        const { stream, metadata } =
            await this._options.parseVideoStreamMetadata(initialStream);

        return {
            stream: stream
                .pipeThrough(this._options.createMediaStreamTransformer())
                .pipeThrough(
                    new InspectStream((packet) => {
                        if (packet.type === "configuration") {
                            switch (metadata.codec) {
                                case ScrcpyVideoCodecId.H264:
                                case undefined: {
                                    const { croppedWidth, croppedHeight } =
                                        h264ParseConfiguration(packet.data);

                                    this._screenWidth = croppedWidth;
                                    this._screenHeight = croppedHeight;
                                }
                            }
                        }
                    })
                ),
            metadata,
        };
    }

    private async createAudioStream(
        initialStream: ReadableStream<Uint8Array>
    ): Promise<AdbScrcpyAudioStreamMetadata> {
        const metadata = await this._options.parseAudioStreamMetadata(
            initialStream
        );

        switch (metadata.type) {
            case "disabled":
            case "errored":
                return metadata;
            case "success":
                return {
                    ...metadata,
                    stream: metadata.stream.pipeThrough(
                        this._options.createMediaStreamTransformer()
                    ),
                };
            default:
                throw new Error(
                    `Unexpected audio metadata type ${
                        metadata["type"] as unknown as string
                    }`
                );
        }
    }

    public async close() {
        await this._process.kill();
    }
}
