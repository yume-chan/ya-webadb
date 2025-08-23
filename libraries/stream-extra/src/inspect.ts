import { TransformStream } from "./stream.js";

export class InspectStream<T> extends TransformStream<T, T> {
    constructor(
        write: (value: T) => void,
        extras?: { close: () => void; cancel: () => void },
    ) {
        super({
            transform(chunk, controller) {
                write(chunk);
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
