import type { Consumable } from "../consumable.js";
import { ReadableStream } from "../stream.js";

import { ConsumableReadableStream } from "./readable.js";

export class ConsumableWrapByteReadableStream extends ReadableStream<
    Consumable<Uint8Array>
> {
    constructor(
        stream: ReadableStream<Uint8Array>,
        chunkSize: number,
        min?: number,
    ) {
        const reader = stream.getReader({ mode: "byob" });
        let array = new Uint8Array(chunkSize);
        super({
            async pull(controller) {
                const { done, value } = await reader.read(array, { min });
                if (done) {
                    controller.close();
                    return;
                }

                await ConsumableReadableStream.enqueue(controller, value);

                array = new Uint8Array(value.buffer);
            },
            cancel(reason) {
                return reader.cancel(reason);
            },
        });
    }
}
