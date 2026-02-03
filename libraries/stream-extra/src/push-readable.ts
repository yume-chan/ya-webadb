import type { MaybePromise } from "@yume-chan/async";
import { isPromiseLike, PromiseResolver } from "@yume-chan/async";

import type {
    AbortSignal,
    QueuingStrategy,
    ReadableStreamDefaultController,
} from "./stream.js";
import { AbortController, ReadableStream } from "./stream.js";
import { TaskQueue } from "./task-queue.js";

export interface PushReadableStreamController<T> {
    abortSignal: AbortSignal;

    /**
     * Enqueue `chunk` into the stream.
     *
     * - If the stream is already cancelled by consumer before calling `enqueue`,
     * the call will return `false`.
     * - If the stream is already closed or errored by producer before calling `enqueue`,
     * the call will throw an error.
     * - If the stream has enough buffer space, the call will return `true`.
     *
     * Otherwise it returns a `Promise`:
     *
     * - If the stream is cancelled by consumer, or closed or errored by producer,
     *   while the `Promise` is pending, the `Promise` will be resolved to `false`.
     * - When the stream has enough buffer space, the `Promise` will be resolved to `true`.
     *
     * @param chunk The value to be enqueued
     */
    enqueue(chunk: T): Promise<boolean>;

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
        let controller!: ReadableStreamDefaultController<T>;
        const tasks = new TaskQueue();

        let zeroHighWaterMarkAllowEnqueue = false;
        // Resolves when consumer calls `reader.read`.
        // Rejects when producer calls `controller.close` or `controller.error`,
        // or consumer calls `reader.cancel`.
        let waterMarkLow: PromiseResolver<undefined> | undefined;

        const abortController = new AbortController();
        // Whether either the consumer has called `stream.cancel()`,
        // or the producer has called `controller.close` or `controller.error`.
        let stopped = false;

        const enqueue = (chunk: T): MaybePromise<boolean> => {
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
                return false;
            }

            if (controller.desiredSize === null) {
                // `desiredSize` being `null` means the stream is in error state,
                // `controller.enqueue` will throw an error for us.
                controller.enqueue(chunk);
                // istanbul ignore next
                throw new Error("unreachable");
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
                return true;
            }

            if (controller.desiredSize <= 0) {
                logger?.({
                    source: "producer",
                    operation: "enqueue",
                    value: chunk,
                    phase: "waiting",
                });

                waterMarkLow = new PromiseResolver<undefined>();
                return waterMarkLow.promise.then(
                    (): boolean => {
                        controller.enqueue(chunk);
                        logger?.({
                            source: "producer",
                            operation: "enqueue",
                            value: chunk,
                            phase: "complete",
                        });
                        return true;
                    },
                    (): boolean => {
                        // Only ignore this in-flight `enqueue` call
                        // future calls will trigger `desiredSize === null` and throw
                        logger?.({
                            source: "producer",
                            operation: "enqueue",
                            value: chunk,
                            phase: "ignored",
                        });
                        return false;
                    },
                );
            }

            controller.enqueue(chunk);
            logger?.({
                source: "producer",
                operation: "enqueue",
                value: chunk,
                phase: "complete",
            });
            return true;
        };

        const close = (explicit: boolean) => {
            logger?.({
                source: "producer",
                operation: "close",
                explicit,
                phase: "start",
            });

            // Allow calling `controller.close` on cancelled stream as `enqueue` does
            // Ignore implicit close on any stopped state
            // But don't allow calling `controller.close` multiple times
            if (abortController.signal.aborted || (stopped && !explicit)) {
                logger?.({
                    source: "producer",
                    operation: "close",
                    explicit,
                    phase: "ignored",
                });
                return;
            }

            // This will throw for us if the stream is not in `readable` state
            controller.close();

            stopped = true;
            // Wake up pending `enqueue`
            waterMarkLow?.reject();

            logger?.({
                source: "producer",
                operation: "close",
                explicit,
                phase: "complete",
            });
        };

        const error = (error: unknown, explicit: boolean) => {
            logger?.({
                source: "producer",
                operation: "error",
                explicit,
                phase: "start",
            });

            stopped = true;
            // `controller.error` won't throw on closed/errored/cancelled stream
            // so don't need any checks
            controller.error(error);
            // Wake up pending `enqueue`
            waterMarkLow?.reject();

            logger?.({
                source: "producer",
                operation: "error",
                explicit,
                phase: "complete",
            });
        };

        super(
            {
                start: (controller_) => {
                    controller = controller_;

                    const result = source({
                        abortSignal: abortController.signal,
                        enqueue: async (chunk) =>
                            // Run `enqueue`s in serial
                            // Use `async/await` to always return a `Promise`
                            await tasks.enqueue(() => enqueue(chunk)),
                        close() {
                            close(true);
                        },
                        error(e) {
                            error(e, true);
                        },
                    });

                    if (!stopped && isPromiseLike(result)) {
                        // If `source` returns a `Promise`,
                        // close the stream when the `Promise` is resolved,
                        // and error the stream when the `Promise` is rejected.
                        // The producer can return a never-settling `Promise`
                        // to disable this behavior.
                        result.then(
                            () => close(false),
                            (e) => error(e, false),
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
                        waterMarkLow.resolve(undefined);
                        waterMarkLow = undefined;
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

                    stopped = true;
                    abortController.abort(reason);
                    waterMarkLow?.reject();

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
