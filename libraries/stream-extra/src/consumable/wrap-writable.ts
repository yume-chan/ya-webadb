import type { Consumable } from "../consumable.js";
import { WritableStream } from "../stream.js";

export class ConsumableWrapWritableStream<in T> extends WritableStream<
    Consumable<T>
> {
    constructor(stream: WritableStream<T>) {
        const writer = stream.getWriter();
        super({
            write(chunk) {
                return chunk.tryConsume((chunk) => writer.write(chunk));
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
