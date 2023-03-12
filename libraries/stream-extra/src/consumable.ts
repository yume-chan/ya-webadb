import { PromiseResolver } from "@yume-chan/async";

import type { QueuingStrategy, WritableStreamDefaultWriter } from "./stream.js";
import { ReadableStream, TransformStream, WritableStream } from "./stream.js";

interface Task {
    run<T>(callback: () => T): T;
}

interface Console {
    createTask(name: string): Task;
}

interface GlobalEx {
    console: Console;
}

// `createTask` allows browser DevTools to track the call stack across async boundaries.
const { console } = globalThis as unknown as GlobalEx;
const createTask: Console["createTask"] =
    console.createTask?.bind(console) ??
    (() => ({
        run(callback) {
            return callback();
        },
    }));

export class Consumable<T> {
    private readonly task: Task;
    private readonly resolver: PromiseResolver<void>;

    public readonly value: T;
    public readonly consumed: Promise<void>;

    public constructor(value: T) {
        this.task = createTask("Consumable");
        this.value = value;
        this.resolver = new PromiseResolver<void>();
        this.consumed = this.resolver.promise;
    }

    public consume() {
        this.resolver.resolve();
    }

    public error(error: any) {
        this.resolver.reject(error);
    }

    public async tryConsume<U>(callback: (value: T) => U) {
        try {
            // eslint-disable-next-line @typescript-eslint/await-thenable
            const result = await this.task.run(() => callback(this.value));
            this.consume();
            return result;
        } catch (e) {
            this.resolver.reject(e);
            throw e;
        }
    }
}

async function enqueue<T>(
    controller: { enqueue: (chunk: Consumable<T>) => void },
    chunk: T
) {
    const output = new Consumable(chunk);
    controller.enqueue(output);
    await output.consumed;
}

export class WrapConsumableStream<T> extends TransformStream<T, Consumable<T>> {
    public constructor() {
        super({
            async transform(chunk, controller) {
                await enqueue(controller, chunk);
            },
        });
    }
}

export class UnwrapConsumableStream<T> extends TransformStream<
    Consumable<T>,
    T
> {
    public constructor() {
        super({
            transform(chunk, controller) {
                controller.enqueue(chunk.value);
                chunk.consume();
            },
        });
    }
}

export interface ConsumableReadableStreamController<T> {
    enqueue(chunk: T): Promise<void>;
    close(): void;
    error(reason: any): void;
}

export interface ConsumableReadableStreamSource<T> {
    start?(
        controller: ConsumableReadableStreamController<T>
    ): void | PromiseLike<void>;
    pull?(
        controller: ConsumableReadableStreamController<T>
    ): void | PromiseLike<void>;
    cancel?(reason: any): void | PromiseLike<void>;
}

export class ConsumableReadableStream<T> extends ReadableStream<Consumable<T>> {
    public constructor(
        source: ConsumableReadableStreamSource<T>,
        strategy?: QueuingStrategy<T>
    ) {
        let wrappedController:
            | ConsumableReadableStreamController<T>
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
                            await enqueue(controller, chunk);
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
            wrappedStrategy
        );
    }
}

export interface ConsumableWritableStreamSink<T> {
    start?(): void | PromiseLike<void>;
    write?(chunk: T): void | PromiseLike<void>;
    abort?(reason: any): void | PromiseLike<void>;
    close?(): void | PromiseLike<void>;
}

export class ConsumableWritableStream<T> extends WritableStream<Consumable<T>> {
    public static async write<T>(
        writer: WritableStreamDefaultWriter<Consumable<T>>,
        value: T
    ) {
        const consumable = new Consumable(value);
        await writer.write(consumable);
        await consumable.consumed;
    }

    public constructor(
        sink: ConsumableWritableStreamSink<T>,
        strategy?: QueuingStrategy<T>
    ) {
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
                start() {
                    return sink.start?.();
                },
                async write(chunk) {
                    await chunk.tryConsume((value) => sink.write?.(value));
                    chunk.consume();
                },
                abort(reason) {
                    return sink.abort?.(reason);
                },
                close() {
                    return sink.close?.();
                },
            },
            wrappedStrategy
        );
    }
}

export interface ConsumableTransformer<I, O> {
    start?(
        controller: ConsumableReadableStreamController<O>
    ): void | PromiseLike<void>;
    transform?(
        chunk: I,
        controller: ConsumableReadableStreamController<O>
    ): void | PromiseLike<void>;
    flush?(
        controller: ConsumableReadableStreamController<O>
    ): void | PromiseLike<void>;
}

export class ConsumableTransformStream<I, O> extends TransformStream<
    Consumable<I>,
    Consumable<O>
> {
    public constructor(transformer: ConsumableTransformer<I, O>) {
        let wrappedController:
            | ConsumableReadableStreamController<O>
            | undefined;

        super({
            async start(controller) {
                wrappedController = {
                    async enqueue(chunk) {
                        await enqueue(controller, chunk);
                    },
                    close() {
                        controller.terminate();
                    },
                    error(reason) {
                        controller.error(reason);
                    },
                };

                await transformer.start?.(wrappedController);
            },
            async transform(chunk) {
                await chunk.tryConsume((value) =>
                    transformer.transform?.(value, wrappedController!)
                );
                chunk.consume();
            },
            async flush() {
                await transformer.flush?.(wrappedController!);
            },
        });
    }
}

export class ConsumableInspectStream<T> extends TransformStream<
    Consumable<T>,
    Consumable<T>
> {
    public constructor(callback: (value: T) => void) {
        super({
            transform(chunk, controller) {
                callback(chunk.value);
                controller.enqueue(chunk);
            },
        });
    }
}
