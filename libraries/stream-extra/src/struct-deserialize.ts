import type Struct from "@yume-chan/struct";
import type { StructValueType } from "@yume-chan/struct";
import { BufferedStream, BufferedStreamEndedError } from "./buffered.js";
import { PushReadableStream, PushReadableStreamController } from "./push-readable.js";
import { ReadableStream, WritableStream, type ReadableWritablePair } from "./stream.js";

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
