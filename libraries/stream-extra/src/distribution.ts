import { TransformStream } from "./stream.js";

export class DistributionStream extends TransformStream<
    Uint8Array,
    Uint8Array
> {
    public constructor(size: number, combine = false) {
        let combineBuffer = combine ? new Uint8Array(size) : undefined;
        let combineBufferOffset = 0;
        let combineBufferAvailable = size;
        super({
            transform(chunk, controller) {
                let offset = 0;
                let available = chunk.byteLength;

                if (combineBuffer && combineBufferOffset !== 0) {
                    if (available >= combineBufferAvailable) {
                        combineBuffer.set(
                            chunk.subarray(0, combineBufferAvailable),
                            combineBufferOffset
                        );
                        offset += combineBufferAvailable;
                        available -= combineBufferAvailable;

                        controller.enqueue(combineBuffer);
                        combineBuffer = new Uint8Array(size);
                        combineBufferOffset = 0;
                        combineBufferAvailable = size;

                        if (available === 0) {
                            return;
                        }
                    } else {
                        combineBuffer.set(chunk, combineBufferOffset);
                        combineBufferOffset += available;
                        combineBufferAvailable -= available;
                        return;
                    }
                }

                while (available >= size) {
                    const end = offset + size;
                    controller.enqueue(chunk.subarray(offset, end));
                    offset = end;
                    available -= size;
                }

                if (available > 0) {
                    if (combineBuffer) {
                        combineBuffer.set(
                            chunk.subarray(offset),
                            combineBufferOffset
                        );
                        combineBufferOffset += chunk.byteLength - offset;
                        combineBufferAvailable -= chunk.byteLength - offset;
                    } else {
                        controller.enqueue(chunk.subarray(offset));
                    }
                }
            },
            flush(controller) {
                if (combineBuffer && combineBufferOffset !== 0) {
                    controller.enqueue(
                        combineBuffer.subarray(0, combineBufferOffset)
                    );
                }
            },
        });
    }
}
