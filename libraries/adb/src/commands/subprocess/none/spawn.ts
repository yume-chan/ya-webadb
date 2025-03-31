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

    readonly #exited = new PromiseResolver<void>();
    get exited(): Promise<void> {
        return this.#exited.promise;
    }

    constructor(socket: AdbSocket, signal?: AbortSignal) {
        this.#socket = socket;
        this.#socket.closed.then(
            () => this.#exited.resolve(),
            (e) => this.#exited.reject(e),
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
    }

    kill(): MaybePromiseLike<void> {
        return this.#socket.close();
    }
}
