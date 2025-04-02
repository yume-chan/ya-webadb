import type { MaybePromiseLike } from "@yume-chan/async";
import { PromiseResolver } from "@yume-chan/async";
import type {
    AbortSignal,
    MaybeConsumable,
    ReadableStream,
    WritableStream,
} from "@yume-chan/stream-extra";

import type { AdbSocket } from "../../../adb.js";

import type { AdbNoneProtocolProcess } from "./spawner.js";

export class AdbNoneProtocolProcessImpl implements AdbNoneProtocolProcess {
    readonly #socket: AdbSocket;

    get stdin(): WritableStream<MaybeConsumable<Uint8Array>> {
        return this.#socket.writable;
    }

    get output(): ReadableStream<Uint8Array> {
        return this.#socket.readable;
    }

    readonly #exited: Promise<undefined>;
    get exited(): Promise<undefined> {
        return this.#exited;
    }

    constructor(socket: AdbSocket, signal?: AbortSignal) {
        this.#socket = socket;

        if (signal) {
            // `signal` won't affect `this.output`
            // So remaining data can still be read
            // (call `controller.error` will discard all pending data)

            const exited = new PromiseResolver<undefined>();
            this.#socket.closed.then(
                () => exited.resolve(undefined),
                (e) => exited.reject(e),
            );
            signal.addEventListener("abort", () => {
                exited.reject(signal.reason);
                this.#socket.close();
            });
            this.#exited = exited.promise;
        } else {
            this.#exited = this.#socket.closed;
        }
    }

    kill(): MaybePromiseLike<void> {
        return this.#socket.close();
    }
}
