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

        const trim = !!options?.trim;
        const trimEnd = !!options?.trimEnd;
        const skipEmpty = !!options?.skipEmpty;
        const enqueue = (
            controller: TransformStreamDefaultController<string>,
            value: string,
        ) => {
            if (trim) {
                value = value.trim();
            } else if (trimEnd) {
                value = value.trimEnd();
            }

            if (value || !skipEmpty) {
                controller.enqueue(value);
            }
        };

        super({
            transform(chunk, controller) {
                if (remaining !== undefined) {
                    chunk = remaining + chunk;
                    remaining = undefined;
                }

                let start = 0;
                while (start < chunk.length) {
                    const index = chunk.indexOf(separator, start);
                    if (index === -1) {
                        // `remaining` can't be an empty string
                        // because `start` is less than `chunk.length`
                        remaining = chunk.substring(start);
                        break;
                    }

                    const value = chunk.substring(start, index);
                    enqueue(controller, value);

                    start = index + separatorLength;
                }
            },
            flush(controller) {
                if (remaining !== undefined) {
                    enqueue(controller, remaining);
                }
            },
        });
    }
}
