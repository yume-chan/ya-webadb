import type { ValueOrPromise } from '@yume-chan/struct';
import { BufferedReadableStream, BufferedReadableStreamEndedError } from './buffered.js';
import { PushReadableStream, PushReadableStreamController } from './push-readable.js';
import { ReadableStream, ReadableWritablePair, WritableStream } from './stream.js';

// TODO: BufferedTransformStream: find better implementation
export class BufferedTransformStream<T> implements ReadableWritablePair<T, Uint8Array> {
    private _readable: ReadableStream<T>;
    public get readable() { return this._readable; }

    private _writable: WritableStream<Uint8Array>;
    public get writable() { return this._writable; }

    constructor(transform: (stream: BufferedReadableStream) => ValueOrPromise<T>) {
        // Convert incoming chunks to a `BufferedReadableStream`
        let sourceStreamController!: PushReadableStreamController<Uint8Array>;

        const buffered = new BufferedReadableStream(new PushReadableStream<Uint8Array>(
            controller =>
                sourceStreamController = controller,
        ));

        this._readable = new ReadableStream<T>({
            async pull(controller) {
                try {
                    const value = await transform(buffered);
                    controller.enqueue(value);
                } catch (e) {
                    // TODO: BufferedTransformStream: The semantic of stream ending is not clear
                    // If the `transform` started but did not finish, it should really be an error?
                    // But we can't detect that, unless there is a `peek` method on buffered stream.
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
                buffered.cancel(reason);
            }
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
