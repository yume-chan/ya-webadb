import { PromiseResolver } from "@yume-chan/async";
import type {
    Consumable,
    PushReadableStreamController,
    ReadableStream,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import {
    ConsumableTransformStream,
    ConsumableWritableStream,
    PushReadableStream,
    StructDeserializeStream,
    WritableStream,
    pipeFrom,
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

type AdbShellProtocolPacketInit = (typeof AdbShellProtocolPacket)["TInit"];

type AdbShellProtocolPacket = StructValueType<typeof AdbShellProtocolPacket>;

class StdinSerializeStream extends ConsumableTransformStream<
    Uint8Array,
    AdbShellProtocolPacketInit
> {
    constructor() {
        super({
            async transform(chunk, controller) {
                await controller.enqueue({
                    id: AdbShellProtocolId.Stdin,
                    data: chunk,
                });
            },
            flush() {
                // TODO: AdbShellSubprocessProtocol: support closing stdin
            },
        });
    }
}

class MultiplexStream<T> {
    private _readable: PushReadableStream<T>;
    private _readableController!: PushReadableStreamController<T>;
    public get readable() {
        return this._readable;
    }

    private _activeCount = 0;

    constructor() {
        this._readable = new PushReadableStream((controller) => {
            this._readableController = controller;
        });
    }

    public createWriteable() {
        return new WritableStream<T>({
            start: () => {
                this._activeCount += 1;
            },
            write: async (chunk) => {
                await this._readableController.enqueue(chunk);
            },
            abort: () => {
                this._activeCount -= 1;
                if (this._activeCount === 0) {
                    this._readableController.close();
                }
            },
            close: () => {
                this._activeCount -= 1;
                if (this._activeCount === 0) {
                    this._readableController.close();
                }
            },
        });
    }
}

/**
 * Shell v2 a.k.a Shell Protocol
 *
 * Features:
 * * `stderr`: Yes
 * * `exit` exit code: Yes
 * * `resize`: Yes
 */
export class AdbSubprocessShellProtocol implements AdbSubprocessProtocol {
    public static isSupported(adb: Adb) {
        return adb.supportsFeature(AdbFeature.ShellV2);
    }

    public static async pty(adb: Adb, command: string) {
        // TODO: AdbShellSubprocessProtocol: Support setting `XTERM` environment variable
        return new AdbSubprocessShellProtocol(
            await adb.createSocket(`shell,v2,pty:${command}`)
        );
    }

    public static async raw(adb: Adb, command: string) {
        return new AdbSubprocessShellProtocol(
            await adb.createSocket(`shell,v2,raw:${command}`)
        );
    }

    readonly #socket: AdbSocket;
    #socketWriter: WritableStreamDefaultWriter<
        Consumable<AdbShellProtocolPacketInit>
    >;

    #stdin: WritableStream<Consumable<Uint8Array>>;
    public get stdin() {
        return this.#stdin;
    }

    #stdout: ReadableStream<Uint8Array>;
    public get stdout() {
        return this.#stdout;
    }

    #stderr: ReadableStream<Uint8Array>;
    public get stderr() {
        return this.#stderr;
    }

    readonly #exit = new PromiseResolver<number>();
    public get exit() {
        return this.#exit.promise;
    }

    public constructor(socket: AdbSocket) {
        this.#socket = socket;

        // Check this image to help you understand the stream graph
        // cspell: disable-next-line
        // https://www.plantuml.com/plantuml/png/bL91QiCm4Bpx5SAdv90lb1JISmiw5XzaQKf5PIkiLZIqzEyLSg8ks13gYtOykpFhiOw93N6UGjVDqK7rZsxKqNw0U_NTgVAy4empOy2mm4_olC0VEVEE47GUpnGjKdgXoD76q4GIEpyFhOwP_m28hW0NNzxNUig1_JdW0bA7muFIJDco1daJ_1SAX9bgvoPJPyIkSekhNYctvIGXrCH6tIsPL5fs-s6J5yc9BpWXhKtNdF2LgVYPGM_6GlMwfhWUsIt4lbScANrwlgVVUifPSVi__t44qStnwPvZwobdSmHHlL57p2vFuHS0

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
                                await stdoutController.enqueue(chunk.data);
                                break;
                            case AdbShellProtocolId.Stderr:
                                await stderrController.enqueue(chunk.data);
                                break;
                        }
                    },
                })
            )
            .then(
                () => {
                    stdoutController.close();
                    stderrController.close();
                    // If `#exit` has already resolved, this will be a no-op
                    this.#exit.reject(
                        new Error("Socket ended without exit message")
                    );
                },
                (e) => {
                    stdoutController.error(e);
                    stderrController.error(e);
                    // If `#exit` has already resolved, this will be a no-op
                    this.#exit.reject(e);
                }
            );

        const multiplexer = new MultiplexStream<
            Consumable<AdbShellProtocolPacketInit>
        >();
        void multiplexer.readable
            .pipeThrough(
                new ConsumableTransformStream({
                    async transform(chunk, controller) {
                        await controller.enqueue(
                            AdbShellProtocolPacket.serialize(chunk)
                        );
                    },
                })
            )
            .pipeTo(socket.writable);

        this.#stdin = pipeFrom(
            multiplexer.createWriteable(),
            new StdinSerializeStream()
        );

        this.#socketWriter = multiplexer.createWriteable().getWriter();
    }

    public async resize(rows: number, cols: number) {
        await ConsumableWritableStream.write(this.#socketWriter, {
            id: AdbShellProtocolId.WindowSizeChange,
            data: encodeUtf8(
                // The "correct" format is `${rows}x${cols},${x_pixels}x${y_pixels}`
                // However, according to https://linux.die.net/man/4/tty_ioctl
                // `x_pixels` and `y_pixels` are unused, so always sending `0` should be fine.
                `${rows}x${cols},0x0\0`
            ),
        });
    }

    public kill() {
        return this.#socket.close();
    }
}
