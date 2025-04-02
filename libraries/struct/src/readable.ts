// TODO: allow over reading (returning a `Uint8Array`, an `offset` and a `length`) to avoid copying

import type { MaybePromiseLike } from "@yume-chan/async";

export class ExactReadableEndedError extends Error {
    constructor() {
        super("ExactReadable ended");
    }
}

export interface ExactReadable {
    readonly position: number;

    /**
     * Read data from the underlying data source.
     *
     * The stream must return exactly `length` bytes or data. If that's not possible
     * (due to end of file or other error condition), it must throw an {@link ExactReadableEndedError}.
     */
    readExactly(length: number): Uint8Array;
}

export class Uint8ArrayExactReadable implements ExactReadable {
    #data: Uint8Array;
    #position: number;

    get position() {
        return this.#position;
    }

    constructor(data: Uint8Array) {
        this.#data = data;
        this.#position = 0;
    }

    readExactly(length: number): Uint8Array {
        if (this.#position + length > this.#data.length) {
            throw new ExactReadableEndedError();
        }

        const result = this.#data.subarray(
            this.#position,
            this.#position + length,
        );

        this.#position += length;
        return result;
    }
}

export interface AsyncExactReadable {
    readonly position: number;

    /**
     * Read data from the underlying data source.
     *
     * The stream must return exactly `length` bytes or data. If that's not possible
     * (due to end of file or other error condition), it must throw an {@link ExactReadableEndedError}.
     */
    readExactly(length: number): MaybePromiseLike<Uint8Array>;
}
