import { Consumable } from "../consumable.js";
import type {
    QueuingStrategy,
    WritableStreamDefaultController,
    WritableStreamDefaultWriter,
} from "../stream.js";
import { WritableStream } from "../stream.js";

export interface ConsumableWritableStreamSink<in T> {
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

export class ConsumableWritableStream<in T> extends WritableStream<
    Consumable<T>
> {
    static async write<T>(
        writer: WritableStreamDefaultWriter<Consumable<T>>,
        value: T,
    ) {
        const consumable = new Consumable(value);
        await writer.write(consumable);
        await consumable.consumed;
    }

    constructor(
        sink: ConsumableWritableStreamSink<T>,
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
                write(chunk, controller) {
                    return chunk.tryConsume((chunk) =>
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
