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
import type { StructValue } from "@yume-chan/struct";
import { buffer, struct, u32, u8 } from "@yume-chan/struct";

import type { Adb, AdbSocket } from "../../../adb.js";
import { AdbFeature } from "../../../features.js";
import { encodeUtf8 } from "../../../utils/index.js";
import type { Process } from "../process.js";
import type { AdbProcessSpawner } from "../spawner.js";

export const AdbShellProtocolId = {
    Stdin: 0,
    Stdout: 1,
    Stderr: 2,
    Exit: 3,
    CloseStdin: 4,
    WindowSizeChange: 5,
} as const;

export type AdbShellProtocolId =
    (typeof AdbShellProtocolId)[keyof typeof AdbShellProtocolId];

// This packet format is used in both directions.
export const AdbShellProtocolPacket = struct(
    {
        id: u8<AdbShellProtocolId>(),
        data: buffer(u32),
    },
    { littleEndian: true },
);

type AdbShellProtocolPacket = StructValue<typeof AdbShellProtocolPacket>;

/**
 * Shell v2 a.k.a Shell Protocol
 *
 * Features:
 * * `stderr`: Yes
 * * `exit` exit code: Yes
 * * `resize`: Yes
 */
export class AdbShellProtocolProcess implements Process {
    readonly #socket: AdbSocket;
    #writer: WritableStreamDefaultWriter<MaybeConsumable<Uint8Array>>;

    #stdin: WritableStream<MaybeConsumable<Uint8Array>>;
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

    readonly #exited = new PromiseResolver<number>();
    get exited() {
        return this.#exited.promise;
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
                                this.#exited.resolve(chunk.data[0]!);
                                break;
                            case AdbShellProtocolId.Stdout:
                                await stdoutController.enqueue(chunk.data);
                                break;
                            case AdbShellProtocolId.Stderr:
                                await stderrController.enqueue(chunk.data);
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
                    this.#exited.reject(
                        new Error("Socket ended without exit message"),
                    );
                },
                (e) => {
                    stdoutController.error(e);
                    stderrController.error(e);
                    // If `#exit` has already resolved, this will be a no-op
                    this.#exited.reject(e);
                },
            );

        this.#writer = this.#socket.writable.getWriter();

        this.#stdin = new MaybeConsumable.WritableStream<Uint8Array>({
            write: async (chunk) => {
                await this.#writer.write(
                    AdbShellProtocolPacket.serialize({
                        id: AdbShellProtocolId.Stdin,
                        data: chunk,
                    }),
                );
            },
        });
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

    kill() {
        return this.#socket.close();
    }
}

export class AdbShellProtocolSpawner implements AdbProcessSpawner {
    #adb: Adb;
    get adb() {
        return this.#adb;
    }

    get isSupported() {
        return this.#adb.canUseFeature(AdbFeature.ShellV2);
    }

    constructor(adb: Adb) {
        this.#adb = adb;
    }

    async raw(command: string[]) {
        return new AdbShellProtocolProcess(
            await this.#adb.createSocket(`shell,v2,raw:${command.join(" ")}`),
        );
    }

    async pty(command: string[]) {
        // TODO: Support setting `XTERM` environment variable
        return new AdbShellProtocolProcess(
            await this.#adb.createSocket(`shell,v2,pty:${command.join(" ")}`),
        );
    }
}
