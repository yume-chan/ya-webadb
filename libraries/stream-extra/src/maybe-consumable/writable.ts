import { Consumable } from "../consumable.js";
import type { MaybeConsumable } from "../maybe-consumable.js";
import type {
    QueuingStrategy,
    WritableStreamDefaultController,
} from "../stream.js";
import { WritableStream } from "../stream.js";

import { tryConsume } from "./utils.js";

export interface MaybeConsumableWritableStreamSink<in T> {
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

export class MaybeConsumableWritableStream<in T> extends WritableStream<
    MaybeConsumable<T>
> {
    constructor(
        sink: MaybeConsumableWritableStreamSink<T>,
        strategy?: QueuingStrategy<T>,
    ) {
        let wrappedStrategy: QueuingStrategy<MaybeConsumable<T>> | undefined;
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
                write(chunk, controller) {
                    return tryConsume(chunk, (chunk) =>
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
