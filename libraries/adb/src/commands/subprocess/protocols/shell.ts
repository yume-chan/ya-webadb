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
    TransformStream,
    WritableStream,
    pipeFrom,
} from "@yume-chan/stream-extra";
import type { StructValueType } from "@yume-chan/struct";
import Struct, { placeholder } from "@yume-chan/struct";

import type { Adb } from "../../../adb.js";
import { AdbFeature } from "../../../features.js";
import type { AdbSocket } from "../../../socket/index.js";
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

class StdoutDeserializeStream extends TransformStream<
    AdbShellProtocolPacket,
    Uint8Array
> {
    constructor(type: AdbShellProtocolId.Stdout | AdbShellProtocolId.Stderr) {
        super({
            transform(chunk, controller) {
                if (chunk.id === type) {
                    controller.enqueue(chunk.data);
                }
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

    private readonly _socket: AdbSocket;
    private _socketWriter: WritableStreamDefaultWriter<
        Consumable<AdbShellProtocolPacketInit>
    >;

    private _stdin: WritableStream<Consumable<Uint8Array>>;
    public get stdin() {
        return this._stdin;
    }

    private _stdout: ReadableStream<Uint8Array>;
    public get stdout() {
        return this._stdout;
    }

    private _stderr: ReadableStream<Uint8Array>;
    public get stderr() {
        return this._stderr;
    }

    private readonly _exit = new PromiseResolver<number>();
    public get exit() {
        return this._exit.promise;
    }

    public constructor(socket: AdbSocket) {
        this._socket = socket;

        // Check this image to help you understand the stream graph
        // cspell: disable-next-line
        // https://www.plantuml.com/plantuml/png/bL91QiCm4Bpx5SAdv90lb1JISmiw5XzaQKf5PIkiLZIqzEyLSg8ks13gYtOykpFhiOw93N6UGjVDqK7rZsxKqNw0U_NTgVAy4empOy2mm4_olC0VEVEE47GUpnGjKdgXoD76q4GIEpyFhOwP_m28hW0NNzxNUig1_JdW0bA7muFIJDco1daJ_1SAX9bgvoPJPyIkSekhNYctvIGXrCH6tIsPL5fs-s6J5yc9BpWXhKtNdF2LgVYPGM_6GlMwfhWUsIt4lbScANrwlgVVUifPSVi__t44qStnwPvZwobdSmHHlL57p2vFuHS0

        // TODO: AdbShellSubprocessProtocol: Optimize stream graph

        const [stdout, stderr] = socket.readable
            .pipeThrough(new StructDeserializeStream(AdbShellProtocolPacket))
            .pipeThrough(
                new TransformStream<
                    AdbShellProtocolPacket,
                    AdbShellProtocolPacket
                >({
                    transform: (chunk, controller) => {
                        if (chunk.id === AdbShellProtocolId.Exit) {
                            this._exit.resolve(new Uint8Array(chunk.data)[0]!);
                            // We can let `StdoutDeserializeStream` to process `AdbShellProtocolId.Exit`,
                            // but since we need this `TransformStream` to capture the exit code anyway,
                            // terminating child streams here is killing two birds with one stone.
                            controller.terminate();
                            return;
                        }
                        controller.enqueue(chunk);
                    },
                })
            )
            .tee();
        this._stdout = stdout.pipeThrough(
            new StdoutDeserializeStream(AdbShellProtocolId.Stdout)
        );
        this._stderr = stderr.pipeThrough(
            new StdoutDeserializeStream(AdbShellProtocolId.Stderr)
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

        this._stdin = pipeFrom(
            multiplexer.createWriteable(),
            new StdinSerializeStream()
        );

        this._socketWriter = multiplexer.createWriteable().getWriter();
    }

    public async resize(rows: number, cols: number) {
        await ConsumableWritableStream.write(this._socketWriter, {
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
        return this._socket.close();
    }
}
