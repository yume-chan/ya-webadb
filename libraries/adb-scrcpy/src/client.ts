import type { Adb, AdbNoneProtocolProcess } from "@yume-chan/adb";
import { AdbReverseNotSupportedError } from "@yume-chan/adb";
import type {
    ScrcpyAudioStreamDisabledMetadata,
    ScrcpyAudioStreamErroredMetadata,
    ScrcpyAudioStreamSuccessMetadata,
    ScrcpyDisplay,
    ScrcpyEncoder,
    ScrcpyMediaStreamPacket,
    ScrcpyOptions1_15,
} from "@yume-chan/scrcpy";
import {
    DefaultServerPath,
    ScrcpyControlMessageWriter,
} from "@yume-chan/scrcpy";
import type {
    Consumable,
    MaybeConsumable,
    ReadableStream,
    ReadableWritablePair,
} from "@yume-chan/stream-extra";
import {
    AbortController,
    BufferedReadableStream,
    PushReadableStream,
    SplitStringStream,
    TextDecoderStream,
    tryCancel,
    WritableStream,
} from "@yume-chan/stream-extra";
import { ExactReadableEndedError } from "@yume-chan/struct";

import type { AdbScrcpyConnection } from "./connection.js";
import type { AdbScrcpyOptions, AdbScrcpyOptionsGetEncoders } from "./types.js";
import { AdbScrcpyVideoStream } from "./video.js";

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
    output: readonly string[];

    constructor(output: readonly string[]) {
        super("scrcpy server exited prematurely");
        this.output = output;
    }
}

interface AdbScrcpyClientInit<TOptions extends AdbScrcpyOptions<object>> {
    options: TOptions;
    process: AdbNoneProtocolProcess;
    output: ReadableStream<string>;

    videoStream: ReadableStream<Uint8Array> | undefined;
    audioStream: ReadableStream<Uint8Array> | undefined;
    controlStream:
        | ReadableWritablePair<Uint8Array, Consumable<Uint8Array>>
        | undefined;
}

export interface AdbScrcpyAudioStreamSuccessMetadata
    extends Omit<ScrcpyAudioStreamSuccessMetadata, "stream"> {
    readonly stream: ReadableStream<ScrcpyMediaStreamPacket>;
}

export type AdbScrcpyAudioStreamMetadata =
    | ScrcpyAudioStreamDisabledMetadata
    | ScrcpyAudioStreamErroredMetadata
    | AdbScrcpyAudioStreamSuccessMetadata;

export class AdbScrcpyClient<TOptions extends AdbScrcpyOptions<object>> {
    static async pushServer(
        adb: Adb,
        file: ReadableStream<MaybeConsumable<Uint8Array>>,
        filename = DefaultServerPath,
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

    static async start<
        TOptions extends AdbScrcpyOptions<
            Pick<ScrcpyOptions1_15.Init, "tunnelForward">
        >,
    >(
        adb: Adb,
        path: string,
        options: TOptions,
    ): Promise<AdbScrcpyClient<TOptions>> {
        let connection: AdbScrcpyConnection | undefined;
        let process: AdbNoneProtocolProcess | undefined;

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

            // Use environment variable CLASSPATH instead of -cp flag
            // This is the approach used by the official scrcpy C implementation
            // See: https://github.com/Genymobile/scrcpy/blob/master/app/src/server.c
            const args = [
                `CLASSPATH=${path}`, // Set environment variable
                "app_process",
                "/", // Parent dir (unused but required)
                "com.genymobile.scrcpy.Server",
                options.version,
                ...options.serialize(),
            ];

            if (options.spawner) {
                process = await options.spawner.spawn(args);
            } else {
                process = await adb.subprocess.noneProtocol.spawn(args);
            }

            const output = process.output
                .pipeThrough(new TextDecoderStream())
                .pipeThrough(new SplitStringStream("\n"));

            // Must read all streams, otherwise the whole connection will be blocked.
            const lines: string[] = [];
            const abortController = new AbortController();
            const pipe = output
                .pipeTo(
                    new WritableStream({
                        write(chunk) {
                            lines.push(chunk);
                        },
                    }),
                    {
                        signal: abortController.signal,
                        preventCancel: true,
                    },
                )
                .catch((e) => {
                    if (abortController.signal.aborted) {
                        return;
                    }

                    throw e;
                });

            const streams = await Promise.race([
                process.exited.then(() => {
                    throw new AdbScrcpyExitedError(lines);
                }),
                connection.getStreams(),
            ]);

            abortController.abort();
            await pipe;

            return new AdbScrcpyClient({
                options,
                process,
                output: concatStreams(arrayToStream(lines), output),
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
    static getEncoders(
        adb: Adb,
        path: string,
        options: AdbScrcpyOptions<object> & AdbScrcpyOptionsGetEncoders,
    ): Promise<ScrcpyEncoder[]> {
        options.setListEncoders();
        return options.getEncoders(adb, path);
    }

    /**
     * This method will modify the given `options`,
     * so don't reuse it elsewhere.
     */
    static getDisplays(
        adb: Adb,
        path: string,
        options: AdbScrcpyOptions<object>,
    ): Promise<ScrcpyDisplay[]> {
        options.setListDisplays();
        return options.getDisplays(adb, path);
    }

    #options: TOptions;
    #process: AdbNoneProtocolProcess;

    #output: ReadableStream<string>;
    get output() {
        return this.#output;
    }

    get exited() {
        return this.#process.exited;
    }

    #videoStream: Promise<AdbScrcpyVideoStream> | undefined;
    /**
     * Gets a `Promise` that resolves to the parsed video stream.
     *
     * On server version 2.1 and above, it will be `undefined` if
     * video is disabled by `options.video: false`.
     *
     * Note: if it's not `undefined`, it must be consumed to prevent
     * the connection from being blocked.
     */
    get videoStream(): TOptions["value"] extends { video: infer T }
        ? T extends false
            ? undefined
            : Promise<AdbScrcpyVideoStream>
        : Promise<AdbScrcpyVideoStream> {
        return this.#videoStream as never;
    }

    #audioStream: Promise<AdbScrcpyAudioStreamMetadata> | undefined;
    /**
     * Gets a `Promise` that resolves to the parsed audio stream.
     *
     * On server versions before 2.0, it will always be `undefined`.
     * On server version 2.0 and above, it will be `undefined` if
     * audio is disabled by `options.audio: false`.
     *
     * Note: if it's not `undefined`, it must be consumed to prevent
     * the connection from being blocked.
     */
    get audioStream() {
        return this.#audioStream;
    }

    #controller: ScrcpyControlMessageWriter | undefined;
    /**
     * Gets the control message writer.
     *
     * On server version 1.22 and above, it will be `undefined` if
     * control is disabled by `options.control: false`.
     */
    get controller() {
        return this.#controller;
    }

    get clipboard(): ReadableStream<string> | undefined {
        return this.#options.clipboard;
    }

    constructor({
        options,
        process,
        output,
        videoStream,
        audioStream,
        controlStream,
    }: AdbScrcpyClientInit<TOptions>) {
        this.#options = options;
        this.#process = process;
        this.#output = output;

        this.#videoStream = videoStream
            ? this.#createVideoStream(videoStream)
            : undefined;

        this.#audioStream = audioStream
            ? this.#createAudioStream(audioStream)
            : undefined;

        if (controlStream) {
            this.#controller = new ScrcpyControlMessageWriter(
                controlStream.writable.getWriter(),
                options,
            );

            this.#parseDeviceMessages(controlStream.readable).catch(() => {});
        }
    }

    async #parseDeviceMessages(controlStream: ReadableStream<Uint8Array>) {
        const buffered = new BufferedReadableStream(controlStream);
        try {
            while (true) {
                let id: number;
                try {
                    const result = await buffered.readExactly(1);
                    id = result[0]!;
                } catch (e) {
                    if (e instanceof ExactReadableEndedError) {
                        this.#options.deviceMessageParsers.close();
                        break;
                    }

                    throw e;
                }

                await this.#options.deviceMessageParsers.parse(id, buffered);
            }
        } catch (e) {
            this.#options.deviceMessageParsers.error(e);
            await tryCancel(buffered);
        }
    }

    async #createVideoStream(initialStream: ReadableStream<Uint8Array>) {
        const { metadata, stream } =
            await this.#options.parseVideoStreamMetadata(initialStream);
        return new AdbScrcpyVideoStream(this.#options, metadata, stream);
    }

    async #createAudioStream(
        initialStream: ReadableStream<Uint8Array>,
    ): Promise<AdbScrcpyAudioStreamMetadata> {
        if (!this.#options.parseAudioStreamMetadata) {
            throw new Error(
                "parsing audio stream is not supported in this version",
            );
        }

        const metadata =
            await this.#options.parseAudioStreamMetadata(initialStream);

        switch (metadata.type) {
            case "disabled":
            case "errored":
                return metadata;
            case "success":
                return {
                    ...metadata,
                    stream: metadata.stream.pipeThrough(
                        this.#options.createMediaStreamTransformer(),
                    ),
                };
            default:
                throw new Error(
                    `Unexpected audio metadata type ${
                        metadata["type"] as unknown as string
                    }`,
                );
        }
    }

    async close() {
        await this.#process.kill();
    }
}
