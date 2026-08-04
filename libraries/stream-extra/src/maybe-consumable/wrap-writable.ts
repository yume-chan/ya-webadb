import type { MaybePromiseLike } from "@yume-chan/async";

import { WritableStream } from "../global/index.js";
import type { MaybeConsumable } from "../maybe-consumable.js";

import { tryConsume } from "./utils.js";

export class MaybeConsumableWrapWritableStream<T> extends WritableStream<
    MaybeConsumable<T>
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
                // `WritableStream<T>` can be wrapped in `WritableStream<MaybeConsumable<T>>`
                // because `writer.write` resolves after the inner `write` callback finishes
                return tryConsume(chunk, async (chunk) => {
                    if (hooks?.write) {
                        await hooks.write(chunk as T);
                    }
                    await writer.write(chunk as T);
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
