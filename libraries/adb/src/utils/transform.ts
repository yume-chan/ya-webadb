import Struct, { decodeUtf8, StructLike, StructValueType } from "@yume-chan/struct";
import { BufferedStream, BufferedStreamEndedError } from "../stream";
import { TransformStream } from "./stream";

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
