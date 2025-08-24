import type { TransformStreamDefaultController } from "./stream.js";
import { TransformStream } from "./stream.js";

export class SplitStringStream extends TransformStream<string, string> {
    constructor(
        separator: string,
        options?: {
            trim?: boolean | undefined;
            trimEnd?: boolean | undefined;
            skipEmpty?: boolean | undefined;
        },
    ) {
        let remaining: string | undefined = undefined;
        const separatorLength = separator.length;
        if (separatorLength === 0) {
            throw new Error("separator must not be empty");
        }

        const enqueue = (
            controller: TransformStreamDefaultController<string>,
            value: string,
        ) => {
            if (options?.trim) {
                value = value.trim();
            } else if (options?.trimEnd) {
                value = value.trimEnd();
            }

            if (!options?.skipEmpty || value) {
                controller.enqueue(value);
            }
        };

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

                    const value = chunk.substring(start, index);
                    enqueue(controller, value);

                    start = index + separatorLength;
                }
            },
            flush(controller) {
                if (remaining) {
                    enqueue(controller, remaining);
                }
            },
        });
    }
}
