import type Struct from "@yume-chan/struct";
import type { StructValueType } from "@yume-chan/struct";

import { BufferedTransformStream } from "./buffered-transform.js";

export class StructDeserializeStream<
    T extends Struct<any, any, any, any>
> extends BufferedTransformStream<StructValueType<T>> {
    public constructor(struct: T) {
        super((stream) => {
            return struct.deserialize(stream);
        });
    }
}
