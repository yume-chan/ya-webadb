import Struct, { decodeUtf8, StructLike, StructValueType } from "@yume-chan/struct";
import { chunkArrayLike } from "../utils/chunk";
import { BufferedStream, BufferedStreamEndedError } from "./buffered";
import { TransformStream, WritableStream, WritableStreamDefaultWriter, ReadableStream, ReadableStreamDefaultReader } from "./detect";

export class DecodeUtf8Stream extends TransformStream<ArrayBuffer, string>{
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
    extends TransformStream<ArrayBuffer, StructValueType<T>>{
    public constructor(struct: T) {
        // Convert incoming chunk to a `ReadableStream`
        const passthrough = new TransformStream<ArrayBuffer, ArrayBuffer>();
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
    extends TransformStream<T['TInit'], ArrayBuffer>{
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
                    controller.close();
                } else {
                    controller.enqueue(result.value);
                }
            }
        });
    }
}

export class ChunkStream extends TransformStream<ArrayBuffer, ArrayBuffer>{
    public constructor(size: number) {
        super({
            transform(chunk, controller) {
                for (const piece of chunkArrayLike(chunk, size)) {
                    controller.enqueue(piece);
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
