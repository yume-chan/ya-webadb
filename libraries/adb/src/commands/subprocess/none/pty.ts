import type {
    ReadableStream,
    WritableStream,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import { MaybeConsumable } from "@yume-chan/stream-extra";

import type { AdbSocket } from "../../../adb.js";

export class AdbNoneProtocolPtyProcess {
    readonly #socket: AdbSocket;

    #writer: WritableStreamDefaultWriter<MaybeConsumable<Uint8Array>>;
    #input: MaybeConsumable.WritableStream<Uint8Array>;
    get input(): WritableStream<MaybeConsumable<Uint8Array>> {
        return this.#input;
    }

    get output(): ReadableStream<Uint8Array> {
        return this.#socket.readable;
    }

    get exited(): Promise<void> {
        return this.#socket.closed;
    }

    constructor(socket: AdbSocket) {
        this.#socket = socket;

        this.#writer = this.#socket.writable.getWriter();
        this.#input = new MaybeConsumable.WritableStream<Uint8Array>({
            write: (chunk) => this.#writer.write(chunk),
        });
    }

    sigint() {
        return this.#writer.write(new Uint8Array([0x03]));
    }

    async kill(): Promise<void> {
        await this.#socket.close();
    }
}
