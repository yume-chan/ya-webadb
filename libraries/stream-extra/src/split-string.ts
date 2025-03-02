import { TransformStream } from "./stream.js";

export class SplitStringStream extends TransformStream<string, string> {
    constructor(separator: string) {
        let remaining: string | undefined = undefined;

        super({
            transform(chunk, controller) {
                if (remaining) {
                    chunk = remaining + chunk;
                    remaining = undefined;
                }

                let start = 0;
                while (start < chunk.length) {
                    const index = chunk.indexOf(separator, start);
                    if (index === -1) {
                        remaining = chunk.substring(start);
                        break;
                    }

                    controller.enqueue(chunk.substring(start, index));
                    start = index + 1;
                }
            },
            flush(controller) {
                if (remaining) {
                    controller.enqueue(remaining);
                }
            },
        });
    }
}
