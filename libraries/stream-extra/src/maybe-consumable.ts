import { Consumable } from "./consumable.js";
import type { WritableStreamDefaultController } from "./stream.js";
import {
    WritableStream as NativeWritableStream,
    TransformStream,
    type QueuingStrategy,
} from "./stream.js";

export type MaybeConsumable<T> = T | Consumable<T>;

export namespace MaybeConsumable {
    export function tryConsume<T, R>(
        value: T,
        callback: (value: T extends Consumable<infer U> ? U : T) => R,
    ): R {
        if (value instanceof Consumable) {
            return value.tryConsume(callback);
        } else {
            return callback(value as never);
        }
    }

    export class UnwrapStream<T> extends TransformStream<
        MaybeConsumable<T>,
        T
    > {
        constructor() {
            super({
                transform(chunk, controller) {
                    MaybeConsumable.tryConsume(chunk, (chunk) => {
                        controller.enqueue(chunk as T);
                    });
                },
            });
        }
    }

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

    export class WritableStream<in T> extends NativeWritableStream<
        MaybeConsumable<T>
    > {
        constructor(
            sink: WritableStreamSink<T>,
            strategy?: QueuingStrategy<T>,
        ) {
            let wrappedStrategy:
                | QueuingStrategy<MaybeConsumable<T>>
                | undefined;
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
                        await MaybeConsumable.tryConsume(chunk, (chunk) =>
                            sink.write?.(chunk as T, controller),
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
}
