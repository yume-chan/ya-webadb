import { PromiseResolver } from "@yume-chan/async";
import type Struct from "@yume-chan/struct";
import type { StructValueType } from "@yume-chan/struct";
import { decodeUtf8 } from "../utils/index.js";
import { BufferedStream, BufferedStreamEndedError } from "./buffered.js";
import { AbortController, AbortSignal, ReadableStream, ReadableStreamDefaultReader, TransformStream, WritableStream, WritableStreamDefaultWriter, type QueuingStrategy, type ReadableStreamDefaultController, type ReadableWritablePair, type UnderlyingSink, type UnderlyingSource } from "./detect.js";

export interface DuplexStreamFactoryOptions {
    preventCloseReadableStreams?: boolean | undefined;

    close?: (() => void | Promise<void>) | undefined;
}

export class DuplexStreamFactory<R, W> {
    private readableControllers: ReadableStreamDefaultController<R>[] = [];
    private pushReadableControllers: PushReadableStreamController<R>[] = [];

    private _closed = new PromiseResolver<void>();
    public get closed() { return this._closed.promise; }

    private options: DuplexStreamFactoryOptions;

    private _closeRequestedByReadable = false;
    private _writableClosed = false;

    public constructor(options?: DuplexStreamFactoryOptions) {
        this.options = options ?? {};
    }

    public createPushReadable(source: PushReadableStreamSource<R>, strategy?: QueuingStrategy<R>): PushReadableStream<R> {
        return new PushReadableStream<R>(controller => {
            this.pushReadableControllers.push(controller);

            controller.abortSignal.addEventListener('abort', async () => {
                this._closeRequestedByReadable = true;
                await this.close();
            });

            source({
                abortSignal: controller.abortSignal,
                async enqueue(chunk) {
                    await controller.enqueue(chunk);
                },
                close: async () => {
                    controller.close();
                    this._closeRequestedByReadable = true;
                    await this.close();
                },
                error: async (e?: any) => {
                    controller.error(e);
                    this._closeRequestedByReadable = true;
                    await this.close();
                },
            });
        }, strategy);
    };

    public createWrapReadable(readable: ReadableStream<R>): WrapReadableStream<R, ReadableStream<R>, void> {
        return new WrapReadableStream<R, ReadableStream<R>, void>({
            async start() {
                return {
                    readable,
                    state: undefined,
                };
            },
            close: async () => {
                this._closeRequestedByReadable = true;
                await this.close();
            },
        });
    }

    public createReadable(source?: UnderlyingSource<R>, strategy?: QueuingStrategy<R>): ReadableStream<R> {
        return new ReadableStream<R>({
            start: async (controller) => {
                this.readableControllers.push(controller);
                await source?.start?.(controller);
            },
            pull: (controller) => {
                return source?.pull?.(controller);
            },
            cancel: async (reason) => {
                await source?.cancel?.(reason);
                this._closeRequestedByReadable = true;
                await this.close();
            },
        }, strategy);
    }

    public createWritable(sink: UnderlyingSink<W>, strategy?: QueuingStrategy<W>): WritableStream<W> {
        return new WritableStream<W>({
            start: async (controller) => {
                await sink.start?.(controller);
            },
            write: async (chunk, controller) => {
                if (this._writableClosed) {
                    throw new Error("stream is closed");
                }

                await sink.write?.(chunk, controller);
            },
            close: async () => {
                await sink.close?.();
                this.close();
            },
            abort: async (reason) => {
                await sink.abort?.(reason);
                await this.close();
            },
        }, strategy);
    }

    public async closeReadableStreams() {
        this._closed.resolve();
        await this.options.close?.();

        for (const controller of this.readableControllers) {
            try {
                controller.close();
            } catch { }
        }

        for (const controller of this.pushReadableControllers) {
            try {
                controller.close();
            } catch { }
        }
    }

    public async close() {
        this._writableClosed = true;

        if (this._closeRequestedByReadable ||
            !this.options.preventCloseReadableStreams) {
            await this.closeReadableStreams();
        }
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

export class GatherStringStream extends TransformStream<string, string>{
    // Optimization: rope (concat strings) is faster than `[].join('')`
    private _result = '';
    public get result() { return this._result; }

    public constructor() {
        super({
            transform: (chunk) => {
                this._result += chunk;
            },
        });
    }
}

// TODO: Find other ways to implement `StructTransformStream`
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

        this._readable = new PushReadableStream<StructValueType<T>>(
            async controller => {
                try {
                    // Unless we make `deserialize` be capable of pausing/resuming,
                    // We always need at least one pull loop
                    while (true) {
                        const value = await struct.deserialize(incomingStream);
                        await controller.enqueue(value);
                    }
                } catch (e) {
                    if (e instanceof BufferedStreamEndedError) {
                        controller.close();
                        return;
                    }
                    throw e;
                }
            }
        );

        this._writable = new WritableStream({
            async write(chunk) {
                await incomingStreamController.enqueue(chunk);
            },
            close() {
                // @ts-ignore
                console.log('deserialization stream closed');
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

export interface WritableStreamWrapper<T, W extends WritableStream<T>, S> {
    start(): Promise<{ writable: W, state: S; }>;
    close?(state: S): Promise<void>;
}

export class WrapWritableStream<T, W extends WritableStream<T>, S> extends WritableStream<T>{
    public writable!: W;

    private writer!: WritableStreamDefaultWriter<T>;

    private state!: S;

    public constructor(wrapper: WritableStreamWrapper<T, W, S>) {
        super({
            start: async () => {
                const { writable, state } = await wrapper.start();
                this.writable = writable;
                this.writer = writable.getWriter();
                this.state = state;
            },
            write: async (chunk) => {
                // Maintain back pressure
                await this.writer.ready;
                await this.writer.write(chunk);
            },
            abort: async (reason) => {
                await this.writer.abort(reason);
                wrapper.close?.(this.state);
            },
            close: async () => {
                await this.writer.close();
                await wrapper.close?.(this.state);
            },
        });
    }
}

export interface ReadableStreamWrapper<T, R extends ReadableStream<T>, S> {
    start(): Promise<{ readable: R, state: S; }>;
    close?(state: S): Promise<void>;
}

export class WrapReadableStream<T, R extends ReadableStream<T>, S> extends ReadableStream<T>{
    public readable!: R;

    private reader!: ReadableStreamDefaultReader<T>;

    private state!: S;

    public constructor(wrapper: ReadableStreamWrapper<T, R, S>) {
        super({
            start: async () => {
                const { readable, state } = await wrapper.start();
                this.readable = readable;
                this.reader = readable.getReader();
                this.state = state;
            },
            cancel: async (reason) => {
                await this.reader.cancel(reason);
                wrapper.close?.(this.state);
            },
            pull: async (controller) => {
                const result = await this.reader.read();
                if (result.done) {
                    wrapper.close?.(this.state);
                    controller.close();
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
                        // Only when the stream in errored, `desiredSize` will be `null`.
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
                waterMarkLow?.reject(reason);
                canceled.abort();
            },
        }, strategy);
    }
}
