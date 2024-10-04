import type {
    AbortSignal,
    ReadableStream as ReadableStreamType,
    TransformStream as TransformStreamType,
    WritableStream as WritableStreamType,
} from "./types.js";

export * from "./types.js";

/** A controller object that allows you to abort one or more DOM requests as and when desired. */
export interface AbortController {
    /**
     * Returns the AbortSignal object associated with this object.
     */
    readonly signal: AbortSignal;

    /**
     * Invoking this method will set this object's AbortSignal's aborted flag and signal to any observers that the associated activity is to be aborted.
     */
    abort(reason?: unknown): void;
}

interface AbortControllerConstructor {
    prototype: AbortController;
    new (): AbortController;
}

interface GlobalExtension {
    AbortController: AbortControllerConstructor;
    ReadableStream: typeof ReadableStreamType;
    WritableStream: typeof WritableStreamType;
    TransformStream: typeof TransformStreamType;
}

export type ReadableStream<T> = ReadableStreamType<T>;
export type WritableStream<T> = WritableStreamType<T>;
export type TransformStream<I, O> = TransformStreamType<I, O>;

export const {
    AbortController,
    ReadableStream,
    WritableStream,
    TransformStream,
} = globalThis as unknown as GlobalExtension;
