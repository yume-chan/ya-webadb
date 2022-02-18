import Struct, { decodeUtf8, StructLike, StructValueType } from "@yume-chan/struct";
import { BufferedStream, BufferedStreamEndedError } from "../stream";
import { chunkArrayLike } from "./chunk";
import { TransformStream, WritableStream, WritableStreamDefaultWriter } from "./stream";

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

export interface WritableStreamHooks<T, W extends WritableStream<T>, S> {
    start(): Promise<{ writable: W, state: S; }>;
    close(state: S): Promise<void>;
}

export class HookWritableStream<T, W extends WritableStream<T>, S> extends WritableStream<T>{
    public writable!: W;

    private writer!: WritableStreamDefaultWriter<T>;

    private state!: S;

    public constructor(hooks: WritableStreamHooks<T, W, S>) {
        super({
            start: async () => {
                const { writable, state } = await hooks.start();
                this.writable = writable;
                this.writer = writable.getWriter();
                this.state = state;
            },
            write: async (chunk) => {
                await this.writer.ready;
                await this.writer.write(chunk);
            },
            abort: async (reason) => {
                await this.writer.abort(reason);
                hooks.close(this.state);
            },
            close: async () => {
                await this.writer.close();
                await hooks.close(this.state);
            },
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
