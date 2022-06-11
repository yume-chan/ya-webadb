import { PromiseResolver } from '@yume-chan/async';
import { AbortController, AbortSignal, QueuingStrategy, ReadableStream } from "./stream.js";

export interface PushReadableStreamController<T> {
    abortSignal: AbortSignal;

    enqueue(chunk: T): Promise<void>;

    close(): void;

    error(e?: any): void;
}

export type PushReadableStreamSource<T> = (controller: PushReadableStreamController<T>) => void;

export class PushReadableStream<T> extends ReadableStream<T> {
    public constructor(source: PushReadableStreamSource<T>, strategy?: QueuingStrategy<T>) {
        let waterMarkLow: PromiseResolver<void> | undefined;
        const canceled: AbortController = new AbortController();

        super({
            start: (controller) => {
                source({
                    abortSignal: canceled.signal,
                    async enqueue(chunk) {
                        if (canceled.signal.aborted) {
                            // If the stream is already cancelled,
                            // throw immediately.
                            throw canceled.signal.reason ?? new Error('Aborted');
                        }

                        // Only when the stream is errored, `desiredSize` will be `null`.
                        // But since `null <= 0` is `true`
                        // (`null <= 0` is evaluated as `!(null > 0)` => `!false` => `true`),
                        // not handling it will cause a deadlock.
                        if ((controller.desiredSize ?? 1) <= 0) {
                            waterMarkLow = new PromiseResolver<void>();
                            await waterMarkLow.promise;
                        }

                        // `controller.enqueue` will throw error for us
                        // if the stream is already errored.
                        controller.enqueue(chunk);
                    },
                    close() {
                        controller.close();
                    },
                    error(e) {
                        controller.error(e);
                    },
                });
            },
            pull: () => {
                waterMarkLow?.resolve();
            },
            cancel: async (reason) => {
                canceled.abort(reason);
                waterMarkLow?.reject(reason);
            },
        }, strategy);
    }
}
