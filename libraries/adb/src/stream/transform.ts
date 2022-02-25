import { PromiseResolver } from "@yume-chan/async";
import Struct, { StructLike, StructValueType } from "@yume-chan/struct";
import { decodeUtf8 } from "../utils";
import { BufferedStream, BufferedStreamEndedError } from "./buffered";
import { QueuingStrategy, ReadableStream, ReadableStreamController, ReadableStreamDefaultReader, ReadableWritablePair, TransformStream, UnderlyingSink, UnderlyingSource, WritableStream, WritableStreamDefaultWriter } from "./detect";

export interface DuplexStreamFactoryOptions {
    preventCloseReadableStreams?: boolean | undefined;

    close?: (() => void | Promise<void>) | undefined;
}

export class DuplexStreamFactory<R, W> {
    private readableStreamControllers: ReadableStreamController<R>[] = [];

    private _closed = new PromiseResolver<void>();
    public get closed() { return this._closed.promise; }

    private options: DuplexStreamFactoryOptions;

    private _readableClosed = false;
    private _writableClosed = false;

    public constructor(options?: DuplexStreamFactoryOptions) {
        this.options = options ?? {};
    }

    public createReadable(source?: UnderlyingSource<R>, strategy?: QueuingStrategy<R>): ReadableStream<R> {
        const stream = new ReadableStream<R>({
            start: async (controller) => {
                this.readableStreamControllers.push(controller);
                await source?.start?.(controller);
            },
            pull: async (controller) => {
                await source?.pull?.(controller);
            },
            cancel: async (reason) => {
                await source?.cancel?.(reason);
                this._readableClosed = true;
                await this.close();
            },
        }, strategy);
        return stream;
    }

    public createWritable(sink: UnderlyingSink<W>, strategy?: QueuingStrategy<W>): WritableStream<W> {
        const stream = new WritableStream<W>({
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
        return stream;
    }

    public async closeReadableStreams() {
        this._closed.resolve();
        await this.options.close?.();

        for (const controller of this.readableStreamControllers) {
            try {
                controller.close();
            } catch { }
        }
    }

    public async close() {
        this._writableClosed = true;

        if (this._readableClosed ||
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
export class StructDeserializeStream<T extends StructLike<any>>
    extends TransformStream<Uint8Array, StructValueType<T>>{
    public constructor(struct: T) {
        // Convert incoming chunk to a `ReadableStream`
        const passthrough = new TransformStream<Uint8Array, Uint8Array>();
        const passthroughWriter = passthrough.writable.getWriter();
        // Convert the `ReadableSteam` to a `BufferedStream`
        const bufferedStream = new BufferedStream(passthrough.readable);
        super({
            start(controller) {
                // Don't wait the receive loop
                (async () => {
                    try {
                        // Unless we make `deserialize` be capable of pausing/resuming,
                        // We always need at least one pull loop
                        while (true) {
                            const value = await struct.deserialize(bufferedStream);
                            controller.enqueue(value);
                        }
                    } catch (e) {
                        if (e instanceof BufferedStreamEndedError) {
                            return;
                        }
                        controller.error(e);
                    }
                })();
            },
            transform(chunk) {
                passthroughWriter.write(chunk);
            },
            flush() {
                passthroughWriter.close();
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
    close(state: S): Promise<void>;
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
                wrapper.close(this.state);
            },
            close: async () => {
                await this.writer.close();
                await wrapper.close(this.state);
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
