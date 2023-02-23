import type { ValueOrPromise } from "@yume-chan/struct";

import {
    BufferedReadableStream,
    BufferedReadableStreamEndedError,
} from "./buffered.js";
import type { PushReadableStreamController } from "./push-readable.js";
import { PushReadableStream } from "./push-readable.js";
import type { ReadableWritablePair } from "./stream.js";
import { ReadableStream, WritableStream } from "./stream.js";

// TODO: BufferedTransformStream: find better implementation
export class BufferedTransformStream<T>
    implements ReadableWritablePair<T, Uint8Array>
{
    private _readable: ReadableStream<T>;
    public get readable() {
        return this._readable;
    }

    private _writable: WritableStream<Uint8Array>;
    public get writable() {
        return this._writable;
    }

    constructor(
        transform: (stream: BufferedReadableStream) => ValueOrPromise<T>
    ) {
        // Convert incoming chunks to a `BufferedReadableStream`
        let sourceStreamController!: PushReadableStreamController<Uint8Array>;

        const buffered = new BufferedReadableStream(
            new PushReadableStream<Uint8Array>((controller) => {
                sourceStreamController = controller;
            })
        );

        this._readable = new ReadableStream<T>({
            async pull(controller) {
                try {
                    const value = await transform(buffered);
                    controller.enqueue(value);
                } catch (e) {
                    // Treat `BufferedReadableStreamEndedError` as a normal end.
                    // If the `transform` method doesn't have enough data to return a value,
                    // it should throw another error to indicate that.
                    if (e instanceof BufferedReadableStreamEndedError) {
                        controller.close();
                        return;
                    }
                    throw e;
                }
            },
            cancel: (reason) => {
                // Propagate cancel to the source stream
                // So future writes will be rejected
                return buffered.cancel(reason);
            },
        });

        this._writable = new WritableStream({
            async write(chunk) {
                await sourceStreamController.enqueue(chunk);
            },
            abort() {
                sourceStreamController.close();
            },
            close() {
                sourceStreamController.close();
            },
        });
    }
}
