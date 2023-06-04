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
    ScrcpyDisplay,
    ScrcpyEncoder,
    ScrcpyMediaStreamPacket,
    ScrcpyVideoStreamMetadata,
} from "@yume-chan/scrcpy";
import {
    DEFAULT_SERVER_PATH,
    ScrcpyControlMessageWriter,
    ScrcpyDeviceMessageDeserializeStream,
    ScrcpyVideoCodecId,
    h264ParseConfiguration,
    h265ParseConfiguration,
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
            const reader = stream.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                await controller.enqueue(value);
            }
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

            // Must read all streams, otherwise the whole connection will be blocked.
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
                    if (abortController.signal.aborted) {
                        return;
                    }

                    throw e;
                });

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
        return await options.getEncoders(adb, path, version);
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
    ): Promise<ScrcpyDisplay[]> {
        options.setListDisplays();
        return await options.getDisplays(adb, path, version);
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

    private _controlMessageWriter: ScrcpyControlMessageWriter | undefined;
    public get controlMessageWriter() {
        return this._controlMessageWriter;
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
            this._controlMessageWriter = new ScrcpyControlMessageWriter(
                controlStream.writable.getWriter(),
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
                                case ScrcpyVideoCodecId.H264: {
                                    const { croppedWidth, croppedHeight } =
                                        h264ParseConfiguration(packet.data);

                                    this._screenWidth = croppedWidth;
                                    this._screenHeight = croppedHeight;
                                    break;
                                }
                                case ScrcpyVideoCodecId.H265: {
                                    const { croppedWidth, croppedHeight } =
                                        h265ParseConfiguration(packet.data);

                                    this._screenWidth = croppedWidth;
                                    this._screenHeight = croppedHeight;
                                    break;
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
