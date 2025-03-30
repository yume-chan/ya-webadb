import type {
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

    get exited(): Promise<void> {
        return this.#socket.closed;
    }

    constructor(socket: AdbSocket) {
        this.#socket = socket;
    }

    async kill(): Promise<void> {
        await this.#socket.close();
    }
}
