// cspell: ignore chainable
// cspell: ignore backpressure
// cspell: ignore endregion

// Because Node.js exports Web Streams types from `stream/web` package,
// this module uses Top-Level Await to support both Web Browsers and Node.js.
// For Webpack, the `experimental.topLevelAwait` option is required.
// (See: https://webpack.js.org/configuration/experiments/)

// It's also possible to add fallback to some polyfill.

//#region borrowed
// from https://github.com/microsoft/TypeScript/blob/38da7c600c83e7b31193a62495239a0fe478cb67/lib/lib.webworker.d.ts#L633 until moved to separate lib
/** A controller object that allows you to abort one or more DOM requests as and when desired. */
export interface AbortController {
    /**
     * Returns the AbortSignal object associated with this object.
     */

    readonly signal: AbortSignal;
    /**
     * Invoking this method will set this object's AbortSignal's aborted flag and signal to any observers that the associated activity is to be aborted.
     */
    abort(): void;
}

// A simplified version of AbortSignal events.
export interface AbortSignalEventMap {
    "abort": any;
}

export interface EventListenerOptions {
    capture?: boolean;
}

export interface AddEventListenerOptions extends EventListenerOptions {
    once?: boolean;
    passive?: boolean;
    signal?: AbortSignal;
}

/** A signal object that allows you to communicate with a DOM request (such as a Fetch) and abort it if required via an AbortController object. */
export interface AbortSignal {
    /**
     * Returns true if this AbortSignal's AbortController has signaled to abort, and false otherwise.
     */
    readonly aborted: boolean;

    onabort: ((this: AbortSignal, ev: any) => any) | null;
    addEventListener<K extends keyof AbortSignalEventMap>(type: K, listener: (this: AbortSignal, ev: AbortSignalEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: (ev: any) => void, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<K extends keyof AbortSignalEventMap>(type: K, listener: (this: AbortSignal, ev: AbortSignalEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: (ev: any) => void, options?: boolean | EventListenerOptions): void;
}

export let AbortController: {
    prototype: AbortController;
    new(): AbortController;
};

export let AbortSignal: {
    prototype: AbortSignal;
    new(): AbortSignal;
    // TODO: Add abort() static
};

({ AbortController, AbortSignal } = globalThis as any);
//#endregion borrowed

// https://github.com/microsoft/TypeScript-DOM-lib-generator/blob/11d922f302743cb3fcee9ab59b03d40074a2965c/baselines/dom.generated.d.ts#L1194-L1206
export interface QueuingStrategy<T = any> {
    highWaterMark?: number;
    size?: QueuingStrategySize<T>;
}

export interface QueuingStrategyInit {
    /**
     * Creates a new ByteLengthQueuingStrategy with the provided high water mark.
     *
     * Note that the provided high water mark will not be validated ahead of time. Instead, if it is negative, NaN, or not a number, the resulting ByteLengthQueuingStrategy will cause the corresponding stream constructor to throw.
     */
    highWaterMark: number;
}

// https://github.com/microsoft/TypeScript-DOM-lib-generator/blob/11d922f302743cb3fcee9ab59b03d40074a2965c/baselines/dom.generated.d.ts#L1450-L1468
export interface ReadableStreamDefaultReadDoneResult {
    done: true;
    value?: undefined;
}

export interface ReadableStreamDefaultReadValueResult<T> {
    done: false;
    value: T;
}

export interface ReadableWritablePair<R = any, W = any> {
    readable: ReadableStream<R>;
    /**
     * Provides a convenient, chainable way of piping this readable stream through a transform stream (or any other { writable, readable } pair). It simply pipes the stream into the writable side of the supplied pair, and returns the readable side for further use.
     *
     * Piping a stream will lock it for the duration of the pipe, preventing any other consumer from acquiring a reader.
     */
    writable: WritableStream<W>;
}

// https://github.com/microsoft/TypeScript-DOM-lib-generator/blob/11d922f302743cb3fcee9ab59b03d40074a2965c/baselines/dom.generated.d.ts#L1636
export interface StreamPipeOptions {
    preventAbort?: boolean;
    preventCancel?: boolean;
    /**
     * Pipes this readable stream to a given writable stream destination. The way in which the piping process behaves under various error conditions can be customized with a number of passed options. It returns a promise that fulfills when the piping process completes successfully, or rejects if any errors were encountered.
     *
     * Piping a stream will lock it for the duration of the pipe, preventing any other consumer from acquiring a reader.
     *
     * Errors and closures of the source and destination streams propagate as follows:
     *
     * An error in this source readable stream will abort destination, unless preventAbort is truthy. The returned promise will be rejected with the source's error, or with any error that occurs during aborting the destination.
     *
     * An error in destination will cancel this source readable stream, unless preventCancel is truthy. The returned promise will be rejected with the destination's error, or with any error that occurs during canceling the source.
     *
     * When this source readable stream closes, destination will be closed, unless preventClose is truthy. The returned promise will be fulfilled once this process completes, unless an error is encountered while closing the destination, in which case it will be rejected with that error.
     *
     * If destination starts out closed or closing, this source readable stream will be canceled, unless preventCancel is true. The returned promise will be rejected with an error indicating piping to a closed stream failed, or with any error that occurs during canceling the source.
     *
     * The signal option can be set to an AbortSignal to allow aborting an ongoing pipe operation via the corresponding AbortController. In this case, this source readable stream will be canceled, and destination aborted, unless the respective options preventCancel or preventAbort are set.
     */
    preventClose?: boolean;
    signal?: AbortSignal;
}

// https://github.com/microsoft/TypeScript-DOM-lib-generator/blob/11d922f302743cb3fcee9ab59b03d40074a2965c/baselines/dom.generated.d.ts#L1710
export interface Transformer<I = any, O = any> {
    flush?: TransformerFlushCallback<O>;
    readableType?: undefined;
    start?: TransformerStartCallback<O>;
    transform?: TransformerTransformCallback<I, O>;
    writableType?: undefined;
}

// https://github.com/microsoft/TypeScript-DOM-lib-generator/blob/11d922f302743cb3fcee9ab59b03d40074a2965c/baselines/dom.generated.d.ts#L11132-L11172
/** This Streams API interface represents a readable stream of byte data. The Fetch API offers a concrete instance of a ReadableStream through the body property of a Response object. */
export interface ReadableStream<R = any> {
    readonly locked: boolean;
    cancel(reason?: any): Promise<void>;
    getReader(): ReadableStreamDefaultReader<R>;
    pipeThrough<T>(transform: ReadableWritablePair<T, R>, options?: StreamPipeOptions): ReadableStream<T>;
    pipeTo(destination: WritableStream<R>, options?: StreamPipeOptions): Promise<void>;
    tee(): [ReadableStream<R>, ReadableStream<R>];
}

export let ReadableStream: {
    prototype: ReadableStream;
    new <R = any>(underlyingSource?: UnderlyingSource<R>, strategy?: QueuingStrategy<R>): ReadableStream<R>;
};

export interface ReadableStreamDefaultController<R = any> {
    readonly desiredSize: number | null;
    close(): void;
    enqueue(chunk?: R): void;
    error(e?: any): void;
}

export let ReadableStreamDefaultController: {
    prototype: ReadableStreamDefaultController;
    new(): ReadableStreamDefaultController;
};

export interface ReadableStreamDefaultReader<R = any> extends ReadableStreamGenericReader {
    read(): Promise<ReadableStreamDefaultReadResult<R>>;
    releaseLock(): void;
}

export let ReadableStreamDefaultReader: {
    prototype: ReadableStreamDefaultReader;
    new <R = any>(stream: ReadableStream<R>): ReadableStreamDefaultReader<R>;
};

export interface ReadableStreamGenericReader {
    readonly closed: Promise<undefined>;
    cancel(reason?: any): Promise<void>;
}

// https://github.com/microsoft/TypeScript-DOM-lib-generator/blob/11d922f302743cb3fcee9ab59b03d40074a2965c/baselines/dom.generated.d.ts#L13924-L13944
export interface TransformStream<I = any, O = any> {
    readonly readable: ReadableStream<O>;
    readonly writable: WritableStream<I>;
}

export let TransformStream: {
    prototype: TransformStream;
    new <I = any, O = any>(transformer?: Transformer<I, O>, writableStrategy?: QueuingStrategy<I>, readableStrategy?: QueuingStrategy<O>): TransformStream<I, O>;
};

export interface TransformStreamDefaultController<O = any> {
    readonly desiredSize: number | null;
    enqueue(chunk?: O): void;
    error(reason?: any): void;
    terminate(): void;
}

export let TransformStreamDefaultController: {
    prototype: TransformStreamDefaultController;
    new(): TransformStreamDefaultController;
};

// https://github.com/microsoft/TypeScript-DOM-lib-generator/blob/11d922f302743cb3fcee9ab59b03d40074a2965c/baselines/dom.generated.d.ts#L16509-L16546
/** This Streams API interface provides a standard abstraction for writing streaming data to a destination, known as a sink. This object comes with built-in backpressure and queuing. */
export interface WritableStream<W = any> {
    readonly locked: boolean;
    abort(reason?: any): Promise<void>;
    close(): Promise<void>;
    getWriter(): WritableStreamDefaultWriter<W>;
}

export let WritableStream: {
    prototype: WritableStream;
    new <W = any>(underlyingSink?: UnderlyingSink<W>, strategy?: QueuingStrategy<W>): WritableStream<W>;
};

/** This Streams API interface represents a controller allowing control of a WritableStream's state. When constructing a WritableStream, the underlying sink is given a corresponding WritableStreamDefaultController instance to manipulate. */
export interface WritableStreamDefaultController {
    error(e?: any): void;
}

export let WritableStreamDefaultController: {
    prototype: WritableStreamDefaultController;
    new(): WritableStreamDefaultController;
};

/** This Streams API interface is the object returned by WritableStream.getWriter() and once created locks the < writer to the WritableStream ensuring that no other streams can write to the underlying sink. */
export interface WritableStreamDefaultWriter<W = any> {
    readonly closed: Promise<undefined>;
    readonly desiredSize: number | null;
    readonly ready: Promise<undefined>;
    abort(reason?: any): Promise<void>;
    close(): Promise<void>;
    releaseLock(): void;
    write(chunk?: W): Promise<void>;
}

export let WritableStreamDefaultWriter: {
    prototype: WritableStreamDefaultWriter;
    new <W = any>(stream: WritableStream<W>): WritableStreamDefaultWriter<W>;
};

// https://github.com/microsoft/TypeScript-DOM-lib-generator/blob/11d922f302743cb3fcee9ab59b03d40074a2965c/baselines/dom.generated.d.ts#L17045
export interface QueuingStrategySize<T = any> {
    (chunk: T): number;
}

// https://github.com/microsoft/TypeScript-DOM-lib-generator/blob/11d922f302743cb3fcee9ab59b03d40074a2965c/baselines/dom.generated.d.ts#L17065-L17103
export interface TransformerFlushCallback<O> {
    (controller: TransformStreamDefaultController<O>): void | PromiseLike<void>;
}

export interface TransformerStartCallback<O> {
    (controller: TransformStreamDefaultController<O>): any;
}

export interface TransformerTransformCallback<I, O> {
    (chunk: I, controller: TransformStreamDefaultController<O>): void | PromiseLike<void>;
}

export interface UnderlyingSink<W = any> {
    abort?: UnderlyingSinkAbortCallback;
    close?: UnderlyingSinkCloseCallback;
    start?: UnderlyingSinkStartCallback;
    type?: undefined;
    write?: UnderlyingSinkWriteCallback<W>;
}

export interface UnderlyingSource<R = any> {
    cancel?: UnderlyingSourceCancelCallback;
    pull?: UnderlyingSourcePullCallback<R> | undefined;
    start?: UnderlyingSourceStartCallback<R>;
    type?: undefined;
}

export interface UnderlyingSinkAbortCallback {
    (reason?: any): void | PromiseLike<void>;
}

export interface UnderlyingSinkCloseCallback {
    (): void | PromiseLike<void>;
}

export interface UnderlyingSinkStartCallback {
    (controller: WritableStreamDefaultController): any;
}

export interface UnderlyingSinkWriteCallback<W> {
    (chunk: W, controller: WritableStreamDefaultController): void | PromiseLike<void>;
}

export interface UnderlyingSourceCancelCallback {
    (reason?: any): void | PromiseLike<void>;
}

export interface UnderlyingSourcePullCallback<R> {
    (controller: ReadableStreamController<R>): void | PromiseLike<void>;
}

export interface UnderlyingSourceStartCallback<R> {
    (controller: ReadableStreamController<R>): any;
}

// https://github.com/microsoft/TypeScript-DOM-lib-generator/blob/11d922f302743cb3fcee9ab59b03d40074a2965c/baselines/dom.generated.d.ts#L17796-L17798
export type ReadableStreamController<T> = ReadableStreamDefaultController<T>;
export type ReadableStreamDefaultReadResult<T> = ReadableStreamDefaultReadValueResult<T> | ReadableStreamDefaultReadDoneResult;
export type ReadableStreamReader<T> = ReadableStreamDefaultReader<T>;

// Extra
export interface ReadableStreamIteratorOptions {
    preventCancel?: boolean;
}

// This library can't use `@types/node` or `lib: dom`
// because they will pollute the global scope
// So `ReadableStream`, `WritableStream` and `TransformStream` are not available

if ('ReadableStream' in globalThis && 'WritableStream' in globalThis && 'TransformStream' in globalThis) {
    ({
        ReadableStream,
        ReadableStreamDefaultController,
        ReadableStreamDefaultReader,
        TransformStream,
        TransformStreamDefaultController,
        WritableStream,
        WritableStreamDefaultController,
        WritableStreamDefaultWriter,
    } = globalThis as any);
} else {
    try {
        // // Node.js 16 has Web Streams types in `stream/web` module
        ({
            // @ts-ignore
            ReadableStream,
            // @ts-ignore
            ReadableStreamDefaultController,
            // @ts-ignore
            ReadableStreamDefaultReader,
            // @ts-ignore
            TransformStream,
            // @ts-ignore
            TransformStreamDefaultController,
            // @ts-ignore
            WritableStream,
            // @ts-ignore
            WritableStreamDefaultController,
            // @ts-ignore
            WritableStreamDefaultWriter,
            // @ts-ignore
        } = await import(/* webpackIgnore: true */ 'stream/web'));
    } catch { }
}

// TODO: stream/detect: Load some polyfills

// @ts-ignore
if (!ReadableStream || !WritableStream || !TransformStream) {
    // throw new Error('Web Streams API is not available');
}
