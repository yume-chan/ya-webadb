import type { ValueOrPromise } from "../utils.js";

// TODO: allow over reading (returning a `Uint8Array`, an `offset` and a `length`) to avoid copying

export interface StructDeserializeStream {
    /**
     * Read data from the underlying data source.
     *
     * The stream must return exactly `length` bytes or data. If that's not possible
     * (due to end of file or other error condition), it must throw an error.
     */
    read(length: number): Uint8Array;
}

export interface StructAsyncDeserializeStream {
    /**
     * Read data from the underlying data source.
     *
     * The stream must return exactly `length` bytes or data. If that's not possible
     * (due to end of file or other error condition), it must throw an error.
     */
    read(length: number): ValueOrPromise<Uint8Array>;
}
