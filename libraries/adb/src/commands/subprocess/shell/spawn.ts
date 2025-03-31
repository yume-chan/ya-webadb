import type { MaybePromiseLike } from "@yume-chan/async";
import { PromiseResolver } from "@yume-chan/async";
import type {
    AbortSignal,
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

import type { AdbSocket } from "../../../adb.js";

import { AdbShellProtocolId, AdbShellProtocolPacket } from "./shared.js";
import type { AdbShellProtocolProcess } from "./spawner.js";

export class AdbShellProtocolProcessImpl implements AdbShellProtocolProcess {
    readonly #socket: AdbSocket;
    readonly #writer: WritableStreamDefaultWriter<MaybeConsumable<Uint8Array>>;

    readonly #stdin: WritableStream<MaybeConsumable<Uint8Array>>;
    get stdin() {
        return this.#stdin;
    }

    readonly #stdout: ReadableStream<Uint8Array>;
    get stdout() {
        return this.#stdout;
    }

    readonly #stderr: ReadableStream<Uint8Array>;
    get stderr() {
        return this.#stderr;
    }

    readonly #exited = new PromiseResolver<number>();
    get exited() {
        return this.#exited.promise;
    }

    constructor(socket: AdbSocket, signal?: AbortSignal) {
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
                            default:
                                // Ignore unknown messages like Google ADB does
                                // https://cs.android.com/android/platform/superproject/main/+/main:packages/modules/adb/daemon/shell_service.cpp;l=684;drc=61197364367c9e404c7da6900658f1b16c42d0da
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

        if (signal) {
            const handleAbort = () => {
                this.#socket.close();
                this.#exited.reject(signal.reason);
            };
            signal.addEventListener("abort", handleAbort);
            void this.exited.finally(() =>
                signal.removeEventListener("abort", handleAbort),
            );
        }

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

    kill(): MaybePromiseLike<void> {
        return this.#socket.close();
    }
}
