import type Struct from "@yume-chan/struct";

import { TransformStream } from "./stream.js";

export class StructSerializeStream<
    T extends Struct<any, any, any, any>
> extends TransformStream<T["TInit"], Uint8Array> {
    constructor(struct: T) {
        super({
            transform(chunk, controller) {
                controller.enqueue(struct.serialize(chunk));
            },
        });
    }
}
