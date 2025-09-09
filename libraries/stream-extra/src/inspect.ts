import type { MaybePromiseLike } from "@yume-chan/async";
import { TransformStream } from "./stream.js";

export class InspectStream<T> extends TransformStream<T, T> {
    constructor(
        write: (value: T) => MaybePromiseLike<undefined>,
        extras?: { close: () => void; cancel: () => void },
    ) {
        super({
            async transform(chunk, controller) {
                await write(chunk);
                controller.enqueue(chunk);
            },
            flush() {
                extras?.close?.();
            },
            cancel() {
                extras?.cancel?.();
            },
        });
    }
}
