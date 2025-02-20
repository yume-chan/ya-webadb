import type { MaybePromiseLike } from "@yume-chan/async";
import { StructEmptyError } from "@yume-chan/struct";

import { BufferedReadableStream } from "./buffered.js";
import type { PushReadableStreamController } from "./push-readable.js";
import { PushReadableStream } from "./push-readable.js";
import type {
    ReadableWritablePair,
    WritableStreamDefaultController,
} from "./stream.js";
import { ReadableStream, WritableStream } from "./stream.js";

// TODO: BufferedTransformStream: find better implementation
export class BufferedTransformStream<T>
    implements ReadableWritablePair<T, Uint8Array>
{
    #readable: ReadableStream<T>;
    get readable() {
        return this.#readable;
    }

    #writable: WritableStream<Uint8Array>;
    get writable() {
        return this.#writable;
    }

    constructor(
        transform: (stream: BufferedReadableStream) => MaybePromiseLike<T>,
    ) {
        // Convert incoming chunks to a `BufferedReadableStream`
        let bufferedStreamController!: PushReadableStreamController<Uint8Array>;

        let writableStreamController!: WritableStreamDefaultController;

        const buffered = new BufferedReadableStream(
            new PushReadableStream<Uint8Array>((controller) => {
                bufferedStreamController = controller;
            }),
        );

        this.#readable = new ReadableStream<T>({
            async pull(controller) {
                try {
                    const value = await transform(buffered);
                    controller.enqueue(value);
                } catch (e) {
                    // Treat `StructEmptyError` as a normal end.
                    // If the `transform` method doesn't have enough data to return a value,
                    // it should throw another error to indicate that.
                    if (e instanceof StructEmptyError) {
                        controller.close();
                        return;
                    }
                    throw e;
                }
            },
            cancel: (reason) => {
                // If a `ReadableStream` is piping into `#writable`,
                // This will cancel the `ReadableStream` immediately.
                // If upstream is writing using `#writable`'s writer, this will
                // throw errors for any future writes
                return writableStreamController.error(reason);
            },
        });

        this.#writable = new WritableStream({
            start(controller) {
                writableStreamController = controller;
            },
            async write(chunk) {
                await bufferedStreamController.enqueue(chunk);
            },
            abort() {
                bufferedStreamController.close();
            },
            close() {
                bufferedStreamController.close();
            },
        });
    }
}
