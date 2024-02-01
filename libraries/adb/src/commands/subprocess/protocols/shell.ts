import { PromiseResolver } from "@yume-chan/async";
import type {
    Consumable,
    PushReadableStreamController,
    ReadableStream,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import {
    ConsumableWritableStream,
    PushReadableStream,
    StructDeserializeStream,
    WritableStream,
} from "@yume-chan/stream-extra";
import type { StructValueType } from "@yume-chan/struct";
import Struct, { placeholder } from "@yume-chan/struct";

import type { Adb, AdbSocket } from "../../../adb.js";
import { AdbFeature } from "../../../features.js";
import { encodeUtf8 } from "../../../utils/index.js";

import type { AdbSubprocessProtocol } from "./types.js";

export enum AdbShellProtocolId {
    Stdin,
    Stdout,
    Stderr,
    Exit,
    CloseStdin,
    WindowSizeChange,
}

// This packet format is used in both direction.
const AdbShellProtocolPacket = new Struct({ littleEndian: true })
    .uint8("id", placeholder<AdbShellProtocolId>())
    .uint32("length")
    .uint8Array("data", { lengthField: "length" });

type AdbShellProtocolPacket = StructValueType<typeof AdbShellProtocolPacket>;

/**
 * Shell v2 a.k.a Shell Protocol
 *
 * Features:
 * * `stderr`: Yes
 * * `exit` exit code: Yes
 * * `resize`: Yes
 */
export class AdbSubprocessShellProtocol implements AdbSubprocessProtocol {
    static isSupported(adb: Adb) {
        return adb.canUseFeature(AdbFeature.ShellV2);
    }

    static async pty(adb: Adb, command: string) {
        // TODO: AdbShellSubprocessProtocol: Support setting `XTERM` environment variable
        return new AdbSubprocessShellProtocol(
            await adb.createSocket(`shell,v2,pty:${command}`),
        );
    }

    static async raw(adb: Adb, command: string) {
        return new AdbSubprocessShellProtocol(
            await adb.createSocket(`shell,v2,raw:${command}`),
        );
    }

    readonly #socket: AdbSocket;
    #writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>;

    #stdin: WritableStream<Consumable<Uint8Array>>;
    get stdin() {
        return this.#stdin;
    }

    #stdout: ReadableStream<Uint8Array>;
    get stdout() {
        return this.#stdout;
    }

    #stderr: ReadableStream<Uint8Array>;
    get stderr() {
        return this.#stderr;
    }

    readonly #exit = new PromiseResolver<number>();
    get exit() {
        return this.#exit.promise;
    }

    constructor(socket: AdbSocket) {
        this.#socket = socket;

        let stdoutController!: PushReadableStreamController<Uint8Array>;
        let stderrController!: PushReadableStreamController<Uint8Array>;
        this.#stdout = new PushReadableStream<Uint8Array>((controller) => {
            stdoutController = controller;
        });
        this.#stderr = new PushReadableStream<Uint8Array>((controller) => {
            stderrController = controller;
        });

        socket.readable
            .pipeThrough(new StructDeserializeStream(AdbShellProtocolPacket))
            .pipeTo(
                new WritableStream<AdbShellProtocolPacket>({
                    write: async (chunk) => {
                        switch (chunk.id) {
                            case AdbShellProtocolId.Exit:
                                this.#exit.resolve(chunk.data[0]!);
                                break;
                            case AdbShellProtocolId.Stdout:
                                if (!stdoutController.abortSignal.aborted) {
                                    await stdoutController.enqueue(chunk.data);
                                }
                                break;
                            case AdbShellProtocolId.Stderr:
                                if (!stderrController.abortSignal.aborted) {
                                    await stderrController.enqueue(chunk.data);
                                }
                                break;
                        }
                    },
                }),
            )
            .then(
                () => {
                    stdoutController.close();
                    stderrController.close();
                    // If `#exit` has already resolved, this will be a no-op
                    this.#exit.reject(
                        new Error("Socket ended without exit message"),
                    );
                },
                (e) => {
                    stdoutController.error(e);
                    stderrController.error(e);
                    // If `#exit` has already resolved, this will be a no-op
                    this.#exit.reject(e);
                },
            );

        this.#writer = this.#socket.writable.getWriter();

        this.#stdin = new WritableStream<Consumable<Uint8Array>>({
            write: async (chunk) => {
                await ConsumableWritableStream.write(
                    this.#writer,
                    AdbShellProtocolPacket.serialize({
                        id: AdbShellProtocolId.Stdin,
                        data: chunk.value,
                    }),
                );
                chunk.consume();
            },
        });
    }

    async resize(rows: number, cols: number) {
        await ConsumableWritableStream.write(
            this.#writer,
            AdbShellProtocolPacket.serialize({
                id: AdbShellProtocolId.WindowSizeChange,
                // The "correct" format is `${rows}x${cols},${x_pixels}x${y_pixels}`
                // However, according to https://linux.die.net/man/4/tty_ioctl
                // `x_pixels` and `y_pixels` are unused, so always sending `0` should be fine.
                data: encodeUtf8(`${rows}x${cols},0x0\0`),
            }),
        );
    }

    kill() {
        return this.#socket.close();
    }
}
