import { TransformStream } from "./stream.js";

export class ChunkStream extends TransformStream<Uint8Array, Uint8Array> {
    public constructor(size: number, buffer = false) {
        let buffered = buffer ? new Uint8Array(size) : undefined;
        let bufferedOffset = 0;
        let bufferedAvailable = size;
        super({
            transform(chunk, controller) {
                let offset = 0;
                if (buffered) {
                    if (chunk.byteLength >= bufferedAvailable) {
                        buffered.set(
                            chunk.subarray(0, bufferedAvailable),
                            bufferedOffset
                        );
                        offset += bufferedAvailable;

                        controller.enqueue(buffered);
                        buffered = new Uint8Array(size);
                        bufferedOffset = 0;
                        bufferedAvailable = size;

                        if (offset === chunk.byteLength) {
                            return;
                        }
                    } else {
                        buffered.set(chunk, bufferedOffset);
                        bufferedOffset += chunk.byteLength;
                        bufferedAvailable -= chunk.byteLength;
                        return;
                    }
                }

                let remaining = chunk.byteLength - offset;
                while (remaining > 0) {
                    if (remaining < size && buffered) {
                        buffered.set(chunk.subarray(offset), bufferedOffset);
                        bufferedOffset += remaining;
                        bufferedAvailable -= remaining;
                        return;
                    }

                    const end = offset + size;
                    controller.enqueue(chunk.subarray(offset, end));
                    offset = end;
                    remaining -= size;
                }
            },
            flush(controller) {
                if (buffered && bufferedOffset > 0) {
                    controller.enqueue(buffered.subarray(0, bufferedOffset));
                }
            },
        });
    }
}
