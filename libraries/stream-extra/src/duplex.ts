import { PromiseResolver } from "@yume-chan/async";
import type { ValueOrPromise } from "@yume-chan/struct";

import type {
    ReadableStream,
    ReadableStreamDefaultController,
    WritableStreamDefaultWriter,
} from "./stream.js";
import { WritableStream } from "./stream.js";
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
    close?: (() => ValueOrPromise<boolean | void>) | undefined;

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
    private readableControllers: ReadableStreamDefaultController<R>[] = [];
    private writers: WritableStreamDefaultWriter<W>[] = [];

    private _writableClosed = false;
    public get writableClosed() {
        return this._writableClosed;
    }

    private _closed = new PromiseResolver<void>();
    public get closed() {
        return this._closed.promise;
    }

    private options: DuplexStreamFactoryOptions;

    public constructor(options?: DuplexStreamFactoryOptions) {
        this.options = options ?? {};
    }

    public wrapReadable(readable: ReadableStream<R>): WrapReadableStream<R> {
        return new WrapReadableStream<R>({
            start: (controller) => {
                this.readableControllers.push(controller);
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
        });
    }

    public createWritable(stream: WritableStream<W>): WritableStream<W> {
        const writer = stream.getWriter();
        this.writers.push(writer);

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
                await writer.close().catch(NOOP);
                await this.close();
            },
        });
    }

    public async close() {
        if (this._writableClosed) {
            return;
        }
        this._writableClosed = true;

        // Call `close` first, so it can still write data to `WritableStream`s.
        if ((await this.options.close?.()) !== false) {
            // `close` can return `false` to disable automatic `dispose`.
            await this.dispose();
        }

        for (const writer of this.writers) {
            await writer.close().catch(NOOP);
        }
    }

    public async dispose() {
        this._writableClosed = true;
        this._closed.resolve();

        for (const controller of this.readableControllers) {
            try {
                controller.close();
            } catch {
                // ignore
            }
        }

        await this.options.dispose?.();
    }
}
