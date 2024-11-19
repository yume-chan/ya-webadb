import type { MaybePromiseLike } from "@yume-chan/async";
import { PromiseResolver } from "@yume-chan/async";

import type {
    QueuingStrategy,
    ReadableStream,
    ReadableStreamDefaultController,
    WritableStreamDefaultWriter,
} from "./stream.js";
import { WritableStream } from "./stream.js";
import { tryClose } from "./try-close.js";
import { WrapReadableStream } from "./wrap-readable.js";

const NOOP = () => {
    // no-op
};

export interface DuplexStreamFactoryOptions {
    /**
     * Callback when any `ReadableStream` is cancelled (the user doesn't need any more data),
     * or `WritableStream` is ended (the user won't produce any more data),
     * or `DuplexStreamFactory#close` is called.
     *
     * Usually you want to let the other peer know that the duplex stream should be closed.
     *
     * `dispose` will automatically be called after `close` completes,
     * but if you want to wait another peer for a close confirmation and call
     * `DuplexStreamFactory#dispose` yourself, you can return `false`
     * (or a `Promise` that resolves to `false`) to disable the automatic call.
     */
    close?: (() => MaybePromiseLike<boolean | void>) | undefined;

    /**
     * Callback when any `ReadableStream` is closed (the other peer doesn't produce any more data),
     * or `WritableStream` is aborted (the other peer can't receive any more data),
     * or `DuplexStreamFactory#abort` is called.
     *
     * Usually indicates the other peer has closed the duplex stream. You can clean up
     * any resources you have allocated now.
     */
    dispose?: (() => void | Promise<void>) | undefined;
}

/**
 * A factory for creating a duplex stream.
 *
 * It can create multiple `ReadableStream`s and `WritableStream`s,
 * when any of them is closed, all other streams will be closed as well.
 */
export class DuplexStreamFactory<R, W> {
    #readableControllers: ReadableStreamDefaultController<R>[] = [];
    #writers: WritableStreamDefaultWriter<W>[] = [];

    #writableClosed = false;
    get writableClosed() {
        return this.#writableClosed;
    }

    #closed = new PromiseResolver<void>();
    get closed() {
        return this.#closed.promise;
    }

    readonly #options: DuplexStreamFactoryOptions;

    constructor(options?: DuplexStreamFactoryOptions) {
        this.#options = options ?? {};
    }

    wrapReadable(
        readable: ReadableStream<R>,
        strategy?: QueuingStrategy<R>,
    ): WrapReadableStream<R> {
        return new WrapReadableStream<R>(
            {
                start: (controller) => {
                    this.#readableControllers.push(controller);
                    return readable;
                },
                cancel: async () => {
                    // cancel means the local peer wants to close the connection.
                    await this.close();
                },
                close: async () => {
                    // stream end means the remote peer closed the connection first.
                    await this.dispose();
                },
            },
            strategy,
        );
    }

    createWritable(stream: WritableStream<W>): WritableStream<W> {
        const writer = stream.getWriter();
        this.#writers.push(writer);

        // `WritableStream` has no way to tell if the remote peer has closed the connection.
        // So it only triggers `close`.
        return new WritableStream<W>({
            write: async (chunk) => {
                await writer.write(chunk);
            },
            abort: async (reason) => {
                await writer.abort(reason);
                await this.close();
            },
            close: async () => {
                // NOOP: the writer is already closed
                await writer.close().catch(NOOP);
                await this.close();
            },
        });
    }

    async close() {
        if (this.#writableClosed) {
            return;
        }
        this.#writableClosed = true;

        // Call `close` first, so it can still write data to `WritableStream`s.
        if ((await this.#options.close?.()) !== false) {
            // `close` can return `false` to disable automatic `dispose`.
            await this.dispose();
        }

        for (const writer of this.#writers) {
            // NOOP: the writer is already closed
            writer.close().catch(NOOP);
        }
    }

    async dispose() {
        this.#writableClosed = true;
        this.#closed.resolve();

        for (const controller of this.#readableControllers) {
            tryClose(controller);
        }

        await this.#options.dispose?.();
    }
}
