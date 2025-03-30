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

import type { AdbSocket } from "../../../adb.js";

import { AdbShellProtocolId, AdbShellProtocolPacket } from "./shared.js";
import type { AdbShellProtocolProcess } from "./spawner.js";

export class AdbShellProtocolProcessImpl implements AdbShellProtocolProcess {
    #socket: AdbSocket;
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

    #exited = new PromiseResolver<number>();
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

    kill() {
        return this.#socket.close();
    }
}
