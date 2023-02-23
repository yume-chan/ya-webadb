import type { AbortSignal } from "web-streams-polyfill";
import {
    ReadableStream as ReadableStreamPolyfill,
    TransformStream as TransformStreamPolyfill,
    WritableStream as WritableStreamPolyfill,
} from "web-streams-polyfill";
export * from "web-streams-polyfill";

/** A controller object that allows you to abort one or more DOM requests as and when desired. */
export interface AbortController {
    /**
     * Returns the AbortSignal object associated with this object.
     */
    readonly signal: AbortSignal;

    /**
     * Invoking this method will set this object's AbortSignal's aborted flag and signal to any observers that the associated activity is to be aborted.
     */
    abort(reason?: any): void;
}

interface AbortControllerConstructor {
    prototype: AbortController;
    new (): AbortController;
}

interface GlobalExtension {
    AbortController: AbortControllerConstructor;
    ReadableStream: typeof ReadableStreamPolyfill;
    WritableStream: typeof WritableStreamPolyfill;
    TransformStream: typeof TransformStreamPolyfill;
}

const GLOBAL = globalThis as unknown as GlobalExtension;

export const AbortController = GLOBAL.AbortController;

export type ReadableStream<R = any> = ReadableStreamPolyfill<R>;
export let ReadableStream = ReadableStreamPolyfill;

export type WritableStream<W = any> = WritableStreamPolyfill<W>;
export let WritableStream = WritableStreamPolyfill;

export type TransformStream<I = any, O = any> = TransformStreamPolyfill<I, O>;
export let TransformStream = TransformStreamPolyfill;

if (GLOBAL.ReadableStream && GLOBAL.WritableStream && GLOBAL.TransformStream) {
    // Use browser native implementation
    ReadableStream = GLOBAL.ReadableStream;
    WritableStream = GLOBAL.WritableStream;
    TransformStream = GLOBAL.TransformStream;
} else {
    // TODO: enable loading Node.js stream implementation when bundler supports Top Level Await
    // try {
    //     // Use Node.js native implementation
    //     const MODULE_NAME = "node:stream/web";
    //     const StreamWeb = (await import(MODULE_NAME)) as GlobalExtension;
    //     ReadableStream = StreamWeb.ReadableStream;
    //     WritableStream = StreamWeb.WritableStream;
    //     TransformStream = StreamWeb.TransformStream;
    // } catch {
    //     // ignore
    // }
}
