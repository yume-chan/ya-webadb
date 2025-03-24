import type { StructDeserializer } from "@yume-chan/struct";

import { BufferedTransformStream } from "./buffered-transform.js";

export class StructDeserializeStream<T> extends BufferedTransformStream<T> {
    constructor(struct: StructDeserializer<T>) {
        super((stream) => {
            return struct.deserialize(stream) as never;
        });
    }
}
