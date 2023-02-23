import { TransformStream } from "./stream.js";

export class ChunkStream extends TransformStream<Uint8Array, Uint8Array> {
    public constructor(size: number) {
        super({
            transform(chunk, controller) {
                for (let start = 0; start < chunk.byteLength; ) {
                    const end = start + size;
                    controller.enqueue(chunk.subarray(start, end));
                    start = end;
                }
            },
        });
    }
}
