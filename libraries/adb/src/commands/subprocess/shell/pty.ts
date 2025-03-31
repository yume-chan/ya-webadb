import { PromiseResolver } from "@yume-chan/async";
import type {
    PushReadableStreamController,
    ReadableStream,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import {
    MaybeConsumable,
    PushReadableStream,
    StructDeserializeStream,
    WritableStream,
} from "@yume-chan/stream-extra";
import { encodeUtf8 } from "@yume-chan/struct";

import type { AdbSocket } from "../../../adb.js";
import type { AdbPtyProcess } from "../pty.js";

import { AdbShellProtocolId, AdbShellProtocolPacket } from "./shared.js";

export class AdbShellProtocolPtyProcess implements AdbPtyProcess<number> {
    readonly #socket: AdbSocket;
    readonly #writer: WritableStreamDefaultWriter<MaybeConsumable<Uint8Array>>;

    readonly #input: WritableStream<MaybeConsumable<Uint8Array>>;
    get input() {
        return this.#input;
    }

    readonly #stdout: ReadableStream<Uint8Array>;
    get output() {
        return this.#stdout;
    }

    readonly #exited = new PromiseResolver<number>();
    get exited() {
        return this.#exited.promise;
    }

    constructor(socket: AdbSocket) {
        this.#socket = socket;

        let stdoutController!: PushReadableStreamController<Uint8Array>;
        this.#stdout = new PushReadableStream<Uint8Array>((controller) => {
            stdoutController = controller;
        });

        socket.readable
            .pipeThrough(new StructDeserializeStream(AdbShellProtocolPacket))
            .pipeTo(
                new WritableStream<AdbShellProtocolPacket>({
                    write: async (chunk) => {
                        switch (chunk.id) {
                            case AdbShellProtocolId.Exit:
                                this.#exited.resolve(chunk.data[0]!);
                                break;
                            case AdbShellProtocolId.Stdout:
                                await stdoutController.enqueue(chunk.data);
                                break;
                        }
                    },
                }),
            )
            .then(
                () => {
                    stdoutController.close();
                    // If `#exit` has already resolved, this will be a no-op
                    this.#exited.reject(
                        new Error("Socket ended without exit message"),
                    );
                },
                (e) => {
                    stdoutController.error(e);
                    // If `#exit` has already resolved, this will be a no-op
                    this.#exited.reject(e);
                },
            );

        this.#writer = this.#socket.writable.getWriter();
        this.#input = new MaybeConsumable.WritableStream<Uint8Array>({
            write: (chunk) => this.#writeStdin(chunk),
        });
    }

    #writeStdin(chunk: Uint8Array) {
        return this.#writer.write(
            AdbShellProtocolPacket.serialize({
                id: AdbShellProtocolId.Stdin,
                data: chunk,
            }),
        );
    }

    async resize(rows: number, cols: number) {
        await this.#writer.write(
            AdbShellProtocolPacket.serialize({
                id: AdbShellProtocolId.WindowSizeChange,
                // The "correct" format is `${rows}x${cols},${x_pixels}x${y_pixels}`
                // However, according to https://linux.die.net/man/4/tty_ioctl
                // `x_pixels` and `y_pixels` are unused, so always sending `0` should be fine.
                data: encodeUtf8(`${rows}x${cols},0x0\0`),
            }),
        );
    }

    sigint() {
        return this.#writeStdin(new Uint8Array([0x03]));
    }

    kill() {
        return this.#socket.close();
    }
}
