import { WritableStream } from "../global/index.js";
import type { MaybeConsumable } from "../maybe-consumable.js";

import { tryConsume } from "./utils.js";

export class MaybeConsumableWrapWritableStream<T> extends WritableStream<
    MaybeConsumable<T>
> {
    constructor(stream: WritableStream<T>) {
        const writer = stream.getWriter();
        super({
            write(chunk) {
                return tryConsume(chunk, (chunk) => writer.write(chunk as T));
            },
            abort(reason) {
                return writer.abort(reason);
            },
            close() {
                return writer.close();
            },
        });
    }
}
