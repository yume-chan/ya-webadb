import type { Consumable } from "../consumable.js";
import { ReadableStream } from "../global/index.js";

import { ConsumableReadableStream } from "./readable.js";

export class ConsumableWrapByteReadableStream extends ReadableStream<
    Consumable<Uint8Array>
> {
    constructor(
        stream: ReadableStream<Uint8Array>,
        chunkSize: number,
        options?: {
            min?: number | undefined;
            onRead?: ((size: number) => void) | undefined;
        },
    ) {
        const reader = stream.getReader({ mode: "byob" });
        let buffer = new ArrayBuffer(chunkSize);
        super({
            async pull(controller) {
                const { done, value } = await reader.read(
                    new Uint8Array(buffer),
                    {
                        min: options?.min,
                    },
                );

                // `value` might be defined even when `done` is true
                if (value) {
                    await ConsumableReadableStream.enqueue(controller, value);
                    options?.onRead?.(value.byteLength);
                }

                if (done) {
                    controller.close();
                    return;
                }

                buffer = value.buffer;
            },
            cancel(reason) {
                return reader.cancel(reason);
            },
        });
    }
}
