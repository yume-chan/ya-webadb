import type { MaybePromiseLike } from "@yume-chan/async";

import type { Consumable } from "../consumable.js";
import { WritableStream } from "../global/index.js";

export class ConsumableWrapWritableStream<in T> extends WritableStream<
    Consumable<T>
> {
    constructor(
        stream: WritableStream<T>,
        hooks?: {
            write?: ((chunk: T) => MaybePromiseLike<void>) | undefined;
            abort?: ((reason?: unknown) => MaybePromiseLike<void>) | undefined;
            close?: (() => MaybePromiseLike<void>) | undefined;
        },
    ) {
        const writer = stream.getWriter();
        super({
            write(chunk) {
                // `WritableStream<T>` can be wrapped in `WritableStream<Consumable<T>>`
                // because `writer.write` resolves after the inner `write` callback finishes
                return chunk.tryConsume(async (chunk) => {
                    if (hooks?.write) {
                        await hooks.write(chunk);
                    }
                    await writer.write(chunk);
                });
            },
            async abort(reason) {
                if (hooks?.abort) {
                    await hooks.abort(reason);
                }
                await writer.abort(reason);
            },
            async close() {
                if (hooks?.close) {
                    await hooks.close();
                }
                await writer.close();
            },
        });
    }
}
