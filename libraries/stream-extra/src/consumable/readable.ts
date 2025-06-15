import { Consumable } from "../consumable.js";
import type { QueuingStrategy } from "../stream.js";
import { ReadableStream } from "../stream.js";

export interface ConsumableReadableStreamController<T> {
    enqueue(chunk: T): Promise<void>;
    close(): void;
    error(reason: unknown): void;
}

export interface ConsumableReadableStreamSource<T> {
    start?(
        controller: ConsumableReadableStreamController<T>,
    ): void | PromiseLike<void>;
    pull?(
        controller: ConsumableReadableStreamController<T>,
    ): void | PromiseLike<void>;
    cancel?(reason: unknown): void | PromiseLike<void>;
}

export class ConsumableReadableStream<T> extends ReadableStream<Consumable<T>> {
    static async enqueue<T>(
        controller: { enqueue: (chunk: Consumable<T>) => void },
        chunk: T,
    ) {
        const output = new Consumable(chunk);
        controller.enqueue(output);
        await output.consumed;
    }

    constructor(
        source: ConsumableReadableStreamSource<T>,
        strategy?: QueuingStrategy<T>,
    ) {
        let wrappedController!: ConsumableReadableStreamController<T>;

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
                start(controller) {
                    wrappedController = {
                        enqueue(chunk) {
                            return ConsumableReadableStream.enqueue(
                                controller,
                                chunk,
                            );
                        },
                        close() {
                            controller.close();
                        },
                        error(reason) {
                            controller.error(reason);
                        },
                    };

                    return source.start?.(wrappedController);
                },
                pull() {
                    return source.pull?.(wrappedController);
                },
                cancel(reason) {
                    return source.cancel?.(reason);
                },
            },
            wrappedStrategy,
        );
    }
}
