import { Consumable } from "./consumable.js";
import { TransformStream } from "./stream.js";

export class DistributionStream extends TransformStream<
    Consumable<Uint8Array>,
    Consumable<Uint8Array>
> {
    public constructor(size: number, combine = false) {
        const combineBuffer = combine ? new Uint8Array(size) : undefined;
        let combineBufferOffset = 0;
        let combineBufferAvailable = size;
        super({
            async transform(chunk, controller) {
                let offset = 0;
                let available = chunk.value.byteLength;

                if (combineBuffer && combineBufferOffset !== 0) {
                    if (available >= combineBufferAvailable) {
                        combineBuffer.set(
                            chunk.value.subarray(0, combineBufferAvailable),
                            combineBufferOffset
                        );
                        offset += combineBufferAvailable;
                        available -= combineBufferAvailable;

                        const output = new Consumable(combineBuffer);
                        controller.enqueue(output);
                        await output.consumed;

                        combineBufferOffset = 0;
                        combineBufferAvailable = size;

                        if (available === 0) {
                            chunk.consume();
                            return;
                        }
                    } else {
                        combineBuffer.set(chunk.value, combineBufferOffset);
                        combineBufferOffset += available;
                        combineBufferAvailable -= available;
                        chunk.consume();
                        return;
                    }
                }

                while (available >= size) {
                    const end = offset + size;

                    const output = new Consumable(
                        chunk.value.subarray(offset, end)
                    );
                    controller.enqueue(output);
                    await output.consumed;

                    offset = end;
                    available -= size;
                }

                if (available > 0) {
                    if (combineBuffer) {
                        combineBuffer.set(
                            chunk.value.subarray(offset),
                            combineBufferOffset
                        );
                        combineBufferOffset += available;
                        combineBufferAvailable -= available;
                    } else {
                        const output = new Consumable(
                            chunk.value.subarray(offset)
                        );
                        controller.enqueue(output);
                        await output.consumed;
                    }
                }

                chunk.consume();
            },
            async flush(controller) {
                if (combineBuffer && combineBufferOffset !== 0) {
                    const output = new Consumable(
                        combineBuffer.subarray(0, combineBufferOffset)
                    );
                    controller.enqueue(output);
                    await output.consumed;
                }
            },
        });
    }
}
