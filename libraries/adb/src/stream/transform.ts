import { PromiseResolver } from "@yume-chan/async";
import type Struct from "@yume-chan/struct";
import type { StructValueType, ValueOrPromise } from "@yume-chan/struct";
import { decodeUtf8 } from "../utils/index.js";
import { BufferedStream, BufferedStreamEndedError } from "./buffered.js";
import { AbortController, AbortSignal, ReadableStream, ReadableStreamDefaultReader, TransformStream, WritableStream, WritableStreamDefaultWriter, type QueuingStrategy, type ReadableStreamDefaultController, type ReadableWritablePair } from "./detect.js";

export interface DuplexStreamFactoryOptions {
    /**
     * Callback when any `ReadableStream` is cancelled (the user doesn't need any more data),
     * or `WritableStream` is ended (the user won't produce any more data),
     * or `DuplexStreamFactory#close` is called.
     *
     * Usually you want to let the other peer know that the duplex stream should be clsoed.
     *
     * `dispose` will automatically be called after `close` completes,
     * but if you want to wait another peer for a close confirmation and call
     * `DuplexStreamFactory#dispose` yourself, you can return `false`
     * (or a `Promise` that resolves to `false`) to disable the automatic call.
     */
    close?: (() => ValueOrPromise<boolean | void>) | undefined;

    /**
     * Callback when any `ReadableStream` is closed (the other peer doesn't produce any more data),
     * or `WritableStream` is aborted (the other peer can't receive any more data),
     * or `DuplexStreamFactory#abort` is called.
     *
     * Usually indicates the other peer has closed the duplex stream. You can clean up
     * any resources you have allocated now.
     */
    dispose?: (() => void | Promise<void>) | undefined;
}

/**
 * A factory for creating a duplex stream.
 *
 * It can create multiple `ReadableStream`s and `WritableStream`s,
 * when any of them is closed, all other streams will be closed as well.
 */
export class DuplexStreamFactory<R, W> {
    private readableControllers: ReadableStreamDefaultController<R>[] = [];
    private writers: WritableStreamDefaultWriter<W>[] = [];

    private _writableClosed = false;
    public get writableClosed() { return this._writableClosed; }

    private _closed = new PromiseResolver<void>();
    public get closed() { return this._closed.promise; }

    private options: DuplexStreamFactoryOptions;

    public constructor(options?: DuplexStreamFactoryOptions) {
        this.options = options ?? {};
    }

    public wrapReadable(readable: ReadableStream<R>): WrapReadableStream<R> {
        return new WrapReadableStream<R>({
            start: (controller) => {
                this.readableControllers.push(controller);
                return readable;
            },
            cancel: async () => {
                // cancel means the local peer closes the connection first.
                await this.close();
            },
            close: async () => {
                // stream end means the remote peer closed the connection first.
                await this.dispose();
            },
        });
    }

    public createWritable(stream: WritableStream<W>): WritableStream<W> {
        const writer = stream.getWriter();
        this.writers.push(writer);

        // `WritableStream` has no way to tell if the remote peer has closed the connection.
        // So it only triggers `close`.
        return new WritableStream<W>({
            write: async (chunk) => {
                await writer.ready;
                await writer.write(chunk);
            },
            abort: async (reason) => {
                await writer.abort(reason);
                await this.close();
            },
            close: async () => {
                try { await writer.close(); } catch { }
                await this.close();
            },
        });
    }

    public async close() {
        if (this._writableClosed) {
            return;
        }
        this._writableClosed = true;

        // Call `close` first, so it can still write data to `WritableStream`s.
        if (await this.options.close?.() !== false) {
            // `close` can return `false` to disable automatic `dispose`.
            await this.dispose();
        }

        for (const writer of this.writers) {
            try { await writer.close(); } catch { }
        }
    }

    public async dispose() {
        this._writableClosed = true;
        this._closed.resolve();

        for (const controller of this.readableControllers) {
            try { controller.close(); } catch { }
        }

        await this.options.dispose?.();
    }
}

export class DecodeUtf8Stream extends TransformStream<Uint8Array, string>{
    public constructor() {
        super({
            transform(chunk, controller) {
                controller.enqueue(decodeUtf8(chunk));
            },
        });
    }
}

export class GatherStringStream extends WritableStream<string>{
    // Optimization: rope (concat strings) is faster than `[].join('')`
    private _result = '';
    public get result() { return this._result; }

    public constructor() {
        super({
            write: (chunk) => {
                this._result += chunk;
            },
        });
    }
}

// TODO: StructTransformStream: Looking for better implementation
export class StructDeserializeStream<T extends Struct<any, any, any, any>>
    implements ReadableWritablePair<Uint8Array, StructValueType<T>>{
    private _readable: ReadableStream<StructValueType<T>>;
    public get readable() { return this._readable; }

    private _writable: WritableStream<Uint8Array>;
    public get writable() { return this._writable; }

    public constructor(struct: T) {
        // Convert incoming chunks to a `BufferedStream`
        let incomingStreamController!: PushReadableStreamController<Uint8Array>;
        const incomingStream = new BufferedStream(
            new PushReadableStream<Uint8Array>(
                controller => incomingStreamController = controller,
            )
        );

        this._readable = new ReadableStream<StructValueType<T>>({
            async pull(controller) {
                try {
                    const value = await struct.deserialize(incomingStream);
                    controller.enqueue(value);
                } catch (e) {
                    if (e instanceof BufferedStreamEndedError) {
                        controller.close();
                        return;
                    }
                    throw e;
                }
            }
        });

        this._writable = new WritableStream({
            async write(chunk) {
                await incomingStreamController.enqueue(chunk);
            },
            abort() {
                incomingStreamController.close();
            },
            close() {
                incomingStreamController.close();
            },
        });
    }
}

export class StructSerializeStream<T extends Struct<any, any, any, any>>
    extends TransformStream<T['TInit'], Uint8Array>{
    constructor(struct: T) {
        super({
            transform(chunk, controller) {
                controller.enqueue(struct.serialize(chunk));
            },
        });
    }
}

export type WrapWritableStreamStart<T> = () => ValueOrPromise<WritableStream<T>>;

export interface WritableStreamWrapper<T> {
    start: WrapWritableStreamStart<T>;
    close?(): Promise<void>;
}

async function getWrappedWritableStream<T>(
    wrapper: WritableStream<T> | WrapWritableStreamStart<T> | WritableStreamWrapper<T>
) {
    if ('start' in wrapper) {
        return await wrapper.start();
    } else if (typeof wrapper === 'function') {
        return await wrapper();
    } else {
        // Can't use `wrapper instanceof WritableStream`
        // Because we want to be compatible with any WritableStream-like objects
        return wrapper;
    }
}

export class WrapWritableStream<T> extends WritableStream<T> {
    public writable!: WritableStream<T>;

    private writer!: WritableStreamDefaultWriter<T>;

    public constructor(wrapper: WritableStream<T> | WrapWritableStreamStart<T> | WritableStreamWrapper<T>) {
        super({
            start: async () => {
                // `start` is invoked before `ReadableStream`'s constructor finish,
                // so using `this` synchronously causes
                // "Must call super constructor in derived class before accessing 'this' or returning from derived constructor".
                // Queue a microtask to avoid this.
                await Promise.resolve();

                this.writable = await getWrappedWritableStream(wrapper);
                this.writer = this.writable.getWriter();
            },
            write: async (chunk) => {
                // Maintain back pressure
                await this.writer.ready;
                await this.writer.write(chunk);
            },
            abort: async (reason) => {
                await this.writer.abort(reason);
                if ('close' in wrapper) {
                    await wrapper.close?.();
                }
            },
            close: async () => {
                // Close the inner stream first.
                // Usually the inner stream is a logical sub-stream over the outer stream,
                // closing the outer stream first will make the inner stream incapable of
                // sending data in its `close` handler.
                await this.writer.close();
                if ('close' in wrapper) {
                    await wrapper.close?.();
                }
            },
        });
    }
}

export type WrapReadableStreamStart<T> = (controller: ReadableStreamDefaultController<T>) => ValueOrPromise<ReadableStream<T>>;

export interface ReadableStreamWrapper<T> {
    start: WrapReadableStreamStart<T>;
    cancel?(reason?: any): ValueOrPromise<void>;
    close?(): ValueOrPromise<void>;
}

function getWrappedReadableStream<T>(
    wrapper: ReadableStream<T> | WrapReadableStreamStart<T> | ReadableStreamWrapper<T>,
    controller: ReadableStreamDefaultController<T>
) {
    if ('start' in wrapper) {
        return wrapper.start(controller);
    } else if (typeof wrapper === 'function') {
        return wrapper(controller);
    } else {
        // Can't use `wrapper instanceof ReadableStream`
        // Because we want to be compatible with any ReadableStream-like objects
        return wrapper;
    }
}

/**
 * This class has multiple usages:
 *
 * 1. Get notified when the stream is cancelled or closed.
 * 2. Synchronously create a `ReadableStream` by asynchronously return another `ReadableStream`.
 * 3. Convert native `ReadableStream`s to polyfilled ones so they can `pipe` between.
 */
export class WrapReadableStream<T> extends ReadableStream<T>{
    public readable!: ReadableStream<T>;

    private reader!: ReadableStreamDefaultReader<T>;

    public constructor(wrapper: ReadableStream<T> | WrapReadableStreamStart<T> | ReadableStreamWrapper<T>) {
        super({
            start: async (controller) => {
                // `start` is invoked before `ReadableStream`'s constructor finish,
                // so using `this` synchronously causes
                // "Must call super constructor in derived class before accessing 'this' or returning from derived constructor".
                // Queue a microtask to avoid this.
                await Promise.resolve();

                this.readable = await getWrappedReadableStream(wrapper, controller);
                this.reader = this.readable.getReader();
            },
            cancel: async (reason) => {
                await this.reader.cancel(reason);
                if ('cancel' in wrapper) {
                    await wrapper.cancel?.(reason);
                }
            },
            pull: async (controller) => {
                const result = await this.reader.read();
                if (result.done) {
                    controller.close();
                    if ('close' in wrapper) {
                        await wrapper.close?.();
                    }
                } else {
                    controller.enqueue(result.value);
                }
            }
        });
    }
}

export class ChunkStream extends TransformStream<Uint8Array, Uint8Array>{
    public constructor(size: number) {
        super({
            transform(chunk, controller) {
                for (let start = 0; start < chunk.byteLength;) {
                    const end = start + size;
                    controller.enqueue(chunk.subarray(start, end));
                    start = end;
                }
            }
        });
    }
}

function* splitLines(text: string): Generator<string, void, void> {
    let start = 0;

    while (true) {
        const index = text.indexOf('\n', start);
        if (index === -1) {
            return;
        }

        const line = text.substring(start, index);
        yield line;

        start = index + 1;
    }
}

export class SplitLineStream extends TransformStream<string, string> {
    public constructor() {
        super({
            transform(chunk, controller) {
                for (const line of splitLines(chunk)) {
                    controller.enqueue(line);
                }
            }
        });
    }
}

/**
 * Create a new `WritableStream` that, when written to, will write that chunk to
 * `pair.writable`, when pipe `pair.readable` to `writable`.
 *
 * It's the opposite of `ReadableStream.pipeThrough`.
 *
 * @param writable The `WritableStream` to write to.
 * @param pair A `TransformStream` that converts chunks.
 * @returns A new `WritableStream`.
 */
export function pipeFrom<W, T>(writable: WritableStream<W>, pair: ReadableWritablePair<W, T>) {
    const writer = pair.writable.getWriter();
    const pipe = pair.readable
        .pipeTo(writable);
    return new WritableStream<T>({
        async write(chunk) {
            await writer.ready;
            await writer.write(chunk);
        },
        async close() {
            await writer.close();
            await pipe;
        }
    });
}

export class InspectStream<T> extends TransformStream<T, T> {
    constructor(callback: (value: T) => void) {
        super({
            transform(chunk, controller) {
                callback(chunk);
                controller.enqueue(chunk);
            }
        });
    }
}

export interface PushReadableStreamController<T> {
    abortSignal: AbortSignal;

    enqueue(chunk: T): Promise<void>;

    close(): void;

    error(e?: any): void;
}

export type PushReadableStreamSource<T> = (controller: PushReadableStreamController<T>) => void;

export class PushReadableStream<T> extends ReadableStream<T> {
    public constructor(source: PushReadableStreamSource<T>, strategy?: QueuingStrategy<T>) {
        let waterMarkLow: PromiseResolver<void> | undefined;
        const canceled: AbortController = new AbortController();

        super({
            start: (controller) => {
                source({
                    abortSignal: canceled.signal,
                    async enqueue(chunk) {
                        if (canceled.signal.aborted) {
                            // If the stream is already cancelled,
                            // throw immediately.
                            throw canceled.signal.reason ?? new Error('Aborted');
                        }

                        // Only when the stream is errored, `desiredSize` will be `null`.
                        // But since `null <= 0` is `true`
                        // (`null <= 0` is evaluated as `!(null > 0)` => `!false` => `true`),
                        // not handling it will cause a deadlock.
                        if ((controller.desiredSize ?? 1) <= 0) {
                            waterMarkLow = new PromiseResolver<void>();
                            await waterMarkLow.promise;
                        }

                        // `controller.enqueue` will throw error for us
                        // if the stream is already errored.
                        controller.enqueue(chunk);
                    },
                    close() {
                        controller.close();
                    },
                    error(e) {
                        controller.error(e);
                    },
                });
            },
            pull: () => {
                waterMarkLow?.resolve();
            },
            cancel: async (reason) => {
                canceled.abort(reason);
                waterMarkLow?.reject(reason);
            },
        }, strategy);
    }
}
