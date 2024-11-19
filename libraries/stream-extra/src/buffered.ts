import type { MaybePromiseLike } from "@yume-chan/async";
import type { AsyncExactReadable } from "@yume-chan/struct";
import { bipedal, ExactReadableEndedError } from "@yume-chan/struct";

import { PushReadableStream } from "./push-readable.js";
import type { ReadableStream, ReadableStreamDefaultReader } from "./stream.js";
import { tryCancel } from "./try-close.js";

export class BufferedReadableStream implements AsyncExactReadable {
    #buffered: Uint8Array | undefined;
    // PERF: `subarray` is slow
    // don't use it until absolutely necessary
    #bufferedOffset = 0;
    #bufferedLength = 0;

    #position = 0;
    get position() {
        return this.#position;
    }

    protected readonly stream: ReadableStream<Uint8Array>;
    protected readonly reader: ReadableStreamDefaultReader<Uint8Array>;

    constructor(stream: ReadableStream<Uint8Array>) {
        this.stream = stream;
        this.reader = stream.getReader();
    }

    #readBuffered(length: number) {
        if (!this.#buffered) {
            return undefined;
        }

        const value = this.#buffered.subarray(
            this.#bufferedOffset,
            this.#bufferedOffset + length,
        );

        // PERF: Synchronous path for reading from internal buffer
        if (this.#bufferedLength > length) {
            this.#position += length;
            this.#bufferedOffset += length;
            this.#bufferedLength -= length;
            return value;
        }

        this.#position += this.#bufferedLength;
        this.#buffered = undefined;
        this.#bufferedOffset = 0;
        this.#bufferedLength = 0;
        return value;
    }

    async #readSource(length: number): Promise<Uint8Array> {
        const { done, value } = await this.reader.read();
        if (done) {
            throw new ExactReadableEndedError();
        }

        if (value.length > length) {
            this.#buffered = value;
            this.#bufferedOffset = length;
            this.#bufferedLength = value.length - length;
            this.#position += length;
            return value.subarray(0, length);
        }

        this.#position += value.length;
        return value;
    }

    iterateExactly(
        length: number,
    ): Iterator<MaybePromiseLike<Uint8Array>, void, void> {
        let state = this.#buffered ? 0 : 1;
        return {
            next: () => {
                switch (state) {
                    case 0: {
                        const value = this.#readBuffered(length)!;
                        if (value.length === length) {
                            state = 2;
                        } else {
                            length -= value.length;
                            state = 1;
                        }
                        return { done: false, value };
                    }
                    case 1:
                        state = 3;
                        return {
                            done: false,
                            value: this.#readSource(length).then((value) => {
                                if (value.length === length) {
                                    state = 2;
                                } else {
                                    length -= value.length;
                                    state = 1;
                                }
                                return value;
                            }),
                        };
                    case 2:
                        return { done: true, value: undefined };
                    case 3:
                        throw new Error(
                            "Can't call `next` before previous Promise resolves",
                        );
                    default:
                        throw new Error("unreachable");
                }
            },
        };
    }

    readExactly = bipedal(function* (
        this: BufferedReadableStream,
        then,
        length: number,
    ) {
        let result: Uint8Array | undefined;
        let index = 0;

        const initial = this.#readBuffered(length);
        if (initial) {
            if (initial.length === length) {
                return initial;
            }

            result = new Uint8Array(length);
            result.set(initial, index);
            index += initial.length;
            length -= initial.length;
        } else {
            result = new Uint8Array(length);
        }

        while (length > 0) {
            const value = yield* then(this.#readSource(length));
            result.set(value, index);
            index += value.length;
            length -= value.length;
        }

        return result;
    });

    /**
     * Return a readable stream with unconsumed data (if any) and
     * all data from the wrapped stream.
     * @returns A `ReadableStream`
     */
    release(): ReadableStream<Uint8Array> {
        if (this.#bufferedLength > 0) {
            return new PushReadableStream<Uint8Array>(async (controller) => {
                // Put the remaining data back to the stream
                const buffered = this.#buffered!.subarray(this.#bufferedOffset);
                await controller.enqueue(buffered);

                controller.abortSignal.addEventListener("abort", () => {
                    void tryCancel(this.reader);
                });

                // Manually pipe the stream
                while (true) {
                    const { done, value } = await this.reader.read();
                    if (done) {
                        return;
                    }

                    await controller.enqueue(value);
                }
            });
        } else {
            // Simply release the reader and return the stream
            this.reader.releaseLock();
            return this.stream;
        }
    }

    async cancel(reason?: unknown) {
        await this.reader.cancel(reason);
    }
}
