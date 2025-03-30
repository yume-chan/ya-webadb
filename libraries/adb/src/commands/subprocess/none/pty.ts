import type {
    MaybeConsumable,
    ReadableStream,
    WritableStream,
} from "@yume-chan/stream-extra";

import type { AdbSocket } from "../../../adb.js";

export class AdbNoneProtocolPtyProcess {
    readonly #socket: AdbSocket;

    get input(): WritableStream<MaybeConsumable<Uint8Array>> {
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
