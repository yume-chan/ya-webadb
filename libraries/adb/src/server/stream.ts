import type { MaybePromiseLike } from "@yume-chan/async";
import type { WritableStreamDefaultWriter } from "@yume-chan/stream-extra";
import {
    BufferedReadableStream,
    tryCancel,
    tryClose,
} from "@yume-chan/stream-extra";
import {
    bipedal,
    decodeUtf8,
    encodeUtf8,
    TextDecoder,
} from "@yume-chan/struct";

import { hexToNumber, sequenceEqual, write4HexDigits } from "../utils/index.js";

import type { AdbServerClient } from "./client.js";

const OKAY = encodeUtf8("OKAY");
export const FAIL = encodeUtf8("FAIL");

export class AdbServerStream {
    #connection: AdbServerClient.ServerConnection;
    #buffered: BufferedReadableStream;
    #writer: WritableStreamDefaultWriter<Uint8Array>;

    constructor(connection: AdbServerClient.ServerConnection) {
        this.#connection = connection;
        this.#buffered = new BufferedReadableStream(connection.readable);
        this.#writer = connection.writable.getWriter();
    }

    readExactly(length: number): MaybePromiseLike<Uint8Array> {
        return this.#buffered.readExactly(length);
    }

    readString = bipedal(function* (this: AdbServerStream, then) {
        const data = yield* then(this.readExactly(4));
        const length = hexToNumber(data);
        if (length === 0) {
            return "";
        } else {
            const decoder = new TextDecoder();
            let result = "";
            const iterator = this.#buffered.iterateExactly(length);
            while (true) {
                const { done, value } = iterator.next();
                if (done) {
                    break;
                }
                result += decoder.decode(yield* then(value), { stream: true });
            }
            result += decoder.decode();
            return result;
        }
    });

    async readOkay(): Promise<void> {
        const response = await this.readExactly(4);
        if (sequenceEqual(response, OKAY)) {
            // `OKAY` is followed by data length and data
            // But different services want to parse the data differently
            // So don't read the data here
            return;
        }

        if (sequenceEqual(response, FAIL)) {
            const reason = await this.readString();
            throw new Error(reason);
        }

        throw new Error(`Unexpected response: ${decodeUtf8(response)}`);
    }

    async writeString(value: string): Promise<void> {
        // TODO: investigate using `encodeUtf8("0000" + value)` then modifying the length
        // That way allocates a new string (hopefully only a rope) instead of a new buffer
        const encoded = encodeUtf8(value);
        const buffer = new Uint8Array(4 + encoded.length);
        write4HexDigits(buffer, 0, encoded.length);
        buffer.set(encoded, 4);
        await this.#writer.write(buffer);
    }

    release() {
        this.#writer.releaseLock();
        return {
            readable: this.#buffered.release(),
            writable: this.#connection.writable,
            closed: this.#connection.closed,
            close: () => this.#connection.close(),
        };
    }

    async dispose() {
        void tryCancel(this.#buffered);
        void tryClose(this.#writer);
        await this.#connection.close();
    }
}
