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
    controller: PushReadableStreamController<T>,
) => void | Promise<void>;

export type PushReadableLogger<T> = (
    event:
        | {
              source: "producer";
              operation: "enqueue";
              value: T;
              phase: "start" | "waiting" | "ignored" | "complete";
          }
        | {
              source: "producer";
              operation: "close" | "error";
              explicit: boolean;
              phase: "start" | "ignored" | "complete";
          }
        | {
              source: "consumer";
              operation: "pull" | "cancel";
              phase: "start" | "complete";
          },
) => void;

export class PushReadableStream<T> extends ReadableStream<T> {
    /**
     * Create a new `PushReadableStream` from a source.
     *
     * @param source If `source` returns a `Promise`, the stream will be closed
     * when the `Promise` is resolved, and be errored when the `Promise` is rejected.
     * @param strategy
     */
    constructor(
        source: PushReadableStreamSource<T>,
        strategy?: QueuingStrategy<T>,
        logger?: PushReadableLogger<T>,
    ) {
        let waterMarkLow: PromiseResolver<void> | undefined;
        let zeroHighWaterMarkAllowEnqueue = false;
        const abortController = new AbortController();

        super(
            {
                start: (controller) => {
                    const result = source({
                        abortSignal: abortController.signal,
                        enqueue: async (chunk) => {
                            logger?.({
                                source: "producer",
                                operation: "enqueue",
                                value: chunk,
                                phase: "start",
                            });

                            if (abortController.signal.aborted) {
                                // In original `ReadableStream`, calling `enqueue` or `close`
                                // on an cancelled stream will throw an error,
                                //
                                // But in `PushReadableStream`, `enqueue` is an async function,
                                // the producer can't just check `abortSignal.aborted`
                                // before calling `enqueue`, as it might change when waiting
                                // for the backpressure to be reduced.
                                //
                                // So IMO it's better to handle this for the producer
                                // by simply ignoring the `enqueue` call.
                                //
                                // Note that we check `abortSignal.aborted` instead of `stopped`,
                                // as it's not allowed for the producer to call `enqueue` after
                                // they called `close` or `error`.
                                //
                                // Obviously, the producer should listen to the `abortSignal` and
                                // stop producing, but most pushing data sources don't support that.
                                logger?.({
                                    source: "producer",
                                    operation: "enqueue",
                                    value: chunk,
                                    phase: "ignored",
                                });
                                return;
                            }

                            if (controller.desiredSize === null) {
                                // `desiredSize` being `null` means the stream is in error state,
                                // `controller.enqueue` will throw an error for us.
                                controller.enqueue(chunk);
                                // istanbul ignore next
                                return;
                            }

                            if (zeroHighWaterMarkAllowEnqueue) {
                                // When `highWaterMark` is set to `0`,
                                // `controller.desiredSize` will always be `0`,
                                // even if the consumer has called `reader.read()`.
                                // (in this case, each `reader.read()`/`pull`
                                // should allow one `enqueue` of any size)
                                //
                                // If the consumer has already called `reader.read()`,
                                // before the producer tries to `enqueue`,
                                // `controller.desiredSize` is `0` and normal `waterMarkLow` signal
                                // will never trigger,
                                // (because `ReadableStream` prevents reentrance of `pull`)
                                // The stream will stuck.
                                //
                                // So we need a special signal for this case.
                                zeroHighWaterMarkAllowEnqueue = false;
                                controller.enqueue(chunk);
                                logger?.({
                                    source: "producer",
                                    operation: "enqueue",
                                    value: chunk,
                                    phase: "complete",
                                });
                                return;
                            }

                            if (controller.desiredSize <= 0) {
                                logger?.({
                                    source: "producer",
                                    operation: "enqueue",
                                    value: chunk,
                                    phase: "waiting",
                                });

                                waterMarkLow = new PromiseResolver<void>();
                                await waterMarkLow.promise;

                                // Recheck consumer cancellation after async operations.
                                if (abortController.signal.aborted) {
                                    logger?.({
                                        source: "producer",
                                        operation: "enqueue",
                                        value: chunk,
                                        phase: "ignored",
                                    });
                                    return;
                                }
                            }

                            controller.enqueue(chunk);
                            logger?.({
                                source: "producer",
                                operation: "enqueue",
                                value: chunk,
                                phase: "complete",
                            });
                        },
                        close() {
                            logger?.({
                                source: "producer",
                                operation: "close",
                                explicit: true,
                                phase: "start",
                            });

                            // Since `enqueue` on an cancelled stream won't throw an error,
                            // so does `close`.
                            if (abortController.signal.aborted) {
                                logger?.({
                                    source: "producer",
                                    operation: "close",
                                    explicit: true,
                                    phase: "ignored",
                                });
                                return;
                            }

                            controller.close();
                            logger?.({
                                source: "producer",
                                operation: "close",
                                explicit: true,
                                phase: "complete",
                            });
                        },
                        error(e) {
                            logger?.({
                                source: "producer",
                                operation: "error",
                                explicit: true,
                                phase: "start",
                            });

                            // Calling `error` on an already closed or errored stream is a no-op.
                            controller.error(e);

                            logger?.({
                                source: "producer",
                                operation: "error",
                                explicit: true,
                                phase: "complete",
                            });
                        },
                    });

                    if (result && "then" in result) {
                        // If `source` returns a `Promise`,
                        // close the stream when the `Promise` is resolved,
                        // and error the stream when the `Promise` is rejected.
                        // The producer can return a never-settling `Promise`
                        // to disable this behavior.
                        result.then(
                            () => {
                                logger?.({
                                    source: "producer",
                                    operation: "close",
                                    explicit: false,
                                    phase: "start",
                                });

                                try {
                                    controller.close();

                                    logger?.({
                                        source: "producer",
                                        operation: "close",
                                        explicit: false,
                                        phase: "complete",
                                    });
                                } catch {
                                    logger?.({
                                        source: "producer",
                                        operation: "close",
                                        explicit: false,
                                        phase: "ignored",
                                    });

                                    // The stream is already closed by the producer,
                                    // Or cancelled by the consumer.
                                }
                            },
                            (e) => {
                                logger?.({
                                    source: "producer",
                                    operation: "error",
                                    explicit: false,
                                    phase: "start",
                                });

                                controller.error(e);

                                logger?.({
                                    source: "producer",
                                    operation: "error",
                                    explicit: false,
                                    phase: "complete",
                                });
                            },
                        );
                    }
                },
                pull: () => {
                    logger?.({
                        source: "consumer",
                        operation: "pull",
                        phase: "start",
                    });

                    if (waterMarkLow) {
                        waterMarkLow.resolve();
                    } else if (strategy?.highWaterMark === 0) {
                        zeroHighWaterMarkAllowEnqueue = true;
                    }

                    logger?.({
                        source: "consumer",
                        operation: "pull",
                        phase: "complete",
                    });
                },
                cancel: (reason) => {
                    logger?.({
                        source: "consumer",
                        operation: "cancel",
                        phase: "start",
                    });

                    abortController.abort(reason);
                    // Resolve it on cancellation. `pull` will check `abortSignal.aborted` again.
                    waterMarkLow?.resolve();

                    logger?.({
                        source: "consumer",
                        operation: "cancel",
                        phase: "complete",
                    });
                },
            },
            strategy,
        );
    }
}
