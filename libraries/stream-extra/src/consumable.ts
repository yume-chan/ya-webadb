import { PromiseResolver, isPromiseLike } from "@yume-chan/async";

import type {
    QueuingStrategy,
    WritableStreamDefaultController,
    WritableStreamDefaultWriter,
} from "./stream.js";
import {
    ReadableStream as NativeReadableStream,
    WritableStream as NativeWritableStream,
} from "./stream.js";
import type { Task } from "./task.js";
import { createTask } from "./task.js";

// Workaround https://github.com/evanw/esbuild/issues/3923
class WritableStream<in T> extends NativeWritableStream<Consumable<T>> {
    static async write<T>(
        writer: WritableStreamDefaultWriter<Consumable<T>>,
        value: T,
    ) {
        const consumable = new Consumable(value);
        await writer.write(consumable);
        await consumable.consumed;
    }

    constructor(
        sink: Consumable.WritableStreamSink<T>,
        strategy?: QueuingStrategy<T>,
    ) {
        let wrappedStrategy: QueuingStrategy<Consumable<T>> | undefined;
        if (strategy) {
            wrappedStrategy = {};
            if ("highWaterMark" in strategy) {
                wrappedStrategy.highWaterMark = strategy.highWaterMark;
            }
            if ("size" in strategy) {
                wrappedStrategy.size = (chunk) => {
                    return strategy.size!(
                        chunk instanceof Consumable ? chunk.value : chunk,
                    );
                };
            }
        }

        super(
            {
                start(controller) {
                    return sink.start?.(controller);
                },
                async write(chunk, controller) {
                    await chunk.tryConsume((chunk) =>
                        sink.write?.(chunk, controller),
                    );
                },
                abort(reason) {
                    return sink.abort?.(reason);
                },
                close() {
                    return sink.close?.();
                },
            },
            wrappedStrategy,
        );
    }
}

class ReadableStream<T> extends NativeReadableStream<Consumable<T>> {
    static async enqueue<T>(
        controller: { enqueue: (chunk: Consumable<T>) => void },
        chunk: T,
    ) {
        const output = new Consumable(chunk);
        controller.enqueue(output);
        await output.consumed;
    }

    constructor(
        source: Consumable.ReadableStreamSource<T>,
        strategy?: QueuingStrategy<T>,
    ) {
        let wrappedController:
            | Consumable.ReadableStreamController<T>
            | undefined;

        let wrappedStrategy: QueuingStrategy<Consumable<T>> | undefined;
        if (strategy) {
            wrappedStrategy = {};
            if ("highWaterMark" in strategy) {
                wrappedStrategy.highWaterMark = strategy.highWaterMark;
            }
            if ("size" in strategy) {
                wrappedStrategy.size = (chunk) => {
                    return strategy.size!(chunk.value);
                };
            }
        }

        super(
            {
                async start(controller) {
                    wrappedController = {
                        async enqueue(chunk) {
                            await ReadableStream.enqueue(controller, chunk);
                        },
                        close() {
                            controller.close();
                        },
                        error(reason) {
                            controller.error(reason);
                        },
                    };

                    await source.start?.(wrappedController);
                },
                async pull() {
                    await source.pull?.(wrappedController!);
                },
                async cancel(reason) {
                    await source.cancel?.(reason);
                },
            },
            wrappedStrategy,
        );
    }
}

export class Consumable<T> {
    static readonly WritableStream = WritableStream;

    static readonly ReadableStream = ReadableStream;

    readonly #task: Task;
    readonly #resolver: PromiseResolver<void>;

    readonly value: T;
    readonly consumed: Promise<void>;

    constructor(value: T) {
        this.#task = createTask("Consumable");
        this.value = value;
        this.#resolver = new PromiseResolver<void>();
        this.consumed = this.#resolver.promise;
    }

    consume() {
        this.#resolver.resolve();
    }

    error(error: unknown) {
        this.#resolver.reject(error);
    }

    tryConsume<U>(callback: (value: T) => U) {
        try {
            let result = this.#task.run(() => callback(this.value));
            if (isPromiseLike(result)) {
                result = result.then(
                    (value) => {
                        this.#resolver.resolve();
                        return value;
                    },
                    (e) => {
                        this.#resolver.reject(e);
                        throw e;
                    },
                ) as U;
            } else {
                this.#resolver.resolve();
            }
            return result;
        } catch (e) {
            this.#resolver.reject(e);
            throw e;
        }
    }
}

export namespace Consumable {
    export interface WritableStreamSink<in T> {
        start?(
            controller: WritableStreamDefaultController,
        ): void | PromiseLike<void>;
        write?(
            chunk: T,
            controller: WritableStreamDefaultController,
        ): void | PromiseLike<void>;
        abort?(reason: unknown): void | PromiseLike<void>;
        close?(): void | PromiseLike<void>;
    }

    export type WritableStream<in T> = typeof Consumable.WritableStream<T>;

    export interface ReadableStreamController<T> {
        enqueue(chunk: T): Promise<void>;
        close(): void;
        error(reason: unknown): void;
    }

    export interface ReadableStreamSource<T> {
        start?(
            controller: ReadableStreamController<T>,
        ): void | PromiseLike<void>;
        pull?(
            controller: ReadableStreamController<T>,
        ): void | PromiseLike<void>;
        cancel?(reason: unknown): void | PromiseLike<void>;
    }

    export type ReadableStream<T> = typeof Consumable.ReadableStream<T>;
}
