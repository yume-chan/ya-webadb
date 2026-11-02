import type { StructInit, StructSerializer } from "@yume-chan/struct";

import { TransformStream } from "./global/index.js";

export class StructSerializeStream<
    T extends StructSerializer<unknown>,
> extends TransformStream<StructInit<T>, Uint8Array> {
    constructor(struct: T) {
        super({
            transform(chunk, controller) {
                controller.enqueue(struct.serialize(chunk));
            },
        });
    }
}
