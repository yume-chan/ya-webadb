import { PromiseResolver } from "@yume-chan/async";

import type { AbortSignal, QueuingStrategy } from "./stream.js";
import { AbortController, ReadableStream } from "./stream.js";

export interface PushReadableStreamController<T> {
    abortSignal: AbortSignal;

    enqueue(chunk: T): Promise<void>;

    close(): void;

    error(e?: unknown): void;
}

export type PushReadableStreamSource<T> = (
    controller: PushReadableStreamController<T>
) => void | Promise<void>;

export class PushReadableStream<T> extends ReadableStream<T> {
    /**
     * Create a new `PushReadableStream` from a source.
     *
     * @param source If `source` returns a `Promise`, the stream will be closed
     * when the `Promise` is resolved, and be errored when the `Promise` is rejected.
     * @param strategy
     */
    public constructor(
        source: PushReadableStreamSource<T>,
        strategy?: QueuingStrategy<T>
    ) {
        let waterMarkLow: PromiseResolver<void> | undefined;
        const abortController = new AbortController();

        super(
            {
                start: (controller) => {
                    const result = source({
                        abortSignal: abortController.signal,
                        async enqueue(chunk) {
                            if (abortController.signal.aborted) {
                                // If the stream is already cancelled,
                                // throw immediately.
                                throw (
                                    abortController.signal.reason ??
                                    new Error("Aborted")
                                );
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

                    if (result && "then" in result) {
                        result.then(
                            () => {
                                try {
                                    controller.close();
                                } catch (e) {
                                    // controller already closed
                                }
                            },
                            (e) => {
                                controller.error(e);
                            }
                        );
                    }
                },
                pull: () => {
                    waterMarkLow?.resolve();
                },
                cancel: (reason) => {
                    abortController.abort(reason);
                    waterMarkLow?.reject(reason);
                },
            },
            strategy
        );
    }
}
