import type { MaybePromiseLike } from "@yume-chan/async";
import { isPromiseLike } from "@yume-chan/async";

import type { BufferedReadableStream } from "./buffered.js";
import type { ReadableStream, ReadableStreamDefaultReader } from "./stream.js";

export function tryClose(value: {
    close(): PromiseLike<void>;
}): Promise<boolean>;
export function tryClose(value: { close(): void }): boolean;
export function tryClose(value: { close(): MaybePromiseLike<void> }) {
    try {
        const result = value.close();
        if (isPromiseLike(result)) {
            return result.then(
                () => true,
                () => false,
            );
        }
        return true;
    } catch {
        return false;
    }
}

export async function tryCancel(
    stream: ReadableStream<unknown>,
): Promise<boolean>;
export async function tryCancel(
    stream: BufferedReadableStream,
): Promise<boolean>;
export async function tryCancel(
    reader: ReadableStreamDefaultReader<unknown>,
): Promise<boolean>;
export async function tryCancel(stream: {
    cancel(): Promise<void>;
}): Promise<boolean> {
    try {
        await stream.cancel();
        return true;
    } catch {
        return false;
    }
}
