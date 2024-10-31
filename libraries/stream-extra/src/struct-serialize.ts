import type { StructInit, StructLike } from "@yume-chan/struct";

import { TransformStream } from "./stream.js";

export class StructSerializeStream<
    T extends StructLike<unknown>,
> extends TransformStream<StructInit<T>, Uint8Array> {
    constructor(struct: T) {
        super({
            transform(chunk, controller) {
                controller.enqueue(struct.serialize(chunk));
            },
        });
    }
}
