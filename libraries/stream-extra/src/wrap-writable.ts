import type { MaybePromiseLike } from "@yume-chan/async";

import type { TransformStream, WritableStreamDefaultWriter } from "./stream.js";
import { WritableStream } from "./stream.js";

export type WrapWritableStreamStart<T> = () => MaybePromiseLike<
    WritableStream<T>
>;

export interface WritableStreamWrapper<T> {
    start: WrapWritableStreamStart<T>;
    close?(): void | Promise<void>;
}

async function getWrappedWritableStream<T>(
    start:
        | WritableStream<T>
        | WrapWritableStreamStart<T>
        | WritableStreamWrapper<T>,
) {
    if ("start" in start) {
        return await start.start();
    } else if (typeof start === "function") {
        return await start();
    } else {
        // Can't use `wrapper instanceof WritableStream`
        // Because we want to be compatible with any WritableStream-like objects
        return start;
    }
}

export class WrapWritableStream<T> extends WritableStream<T> {
    writable!: WritableStream<T>;

    #writer!: WritableStreamDefaultWriter<T>;

    constructor(
        start:
            | WritableStream<T>
            | WrapWritableStreamStart<T>
            | WritableStreamWrapper<T>,
    ) {
        super({
            start: async () => {
                const writable = await getWrappedWritableStream(start);
                // `start` is called in `super()`, so can't use `this` synchronously.
                // but it's fine after the first `await`
                this.writable = writable;
                this.#writer = this.writable.getWriter();
            },
            write: async (chunk) => {
                await this.#writer.write(chunk);
            },
            abort: async (reason) => {
                await this.#writer.abort(reason);
                if (start !== this.writable && "close" in start) {
                    await start.close?.();
                }
            },
            close: async () => {
                // Close the inner stream first.
                // Usually the inner stream is a logical sub-stream over the outer stream,
                // closing the outer stream first will make the inner stream incapable of
                // sending data in its `close` handler.
                await this.#writer.close();
                if (start !== this.writable && "close" in start) {
                    await start.close?.();
                }
            },
        });
    }

    bePipedThroughFrom<U>(transformer: TransformStream<U, T>) {
        let promise: Promise<void>;
        return new WrapWritableStream<U>({
            start: () => {
                promise = transformer.readable.pipeTo(this);
                return transformer.writable;
            },
            async close() {
                await promise;
            },
        });
    }
}
