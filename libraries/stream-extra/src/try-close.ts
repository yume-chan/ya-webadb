import type { BufferedReadableStream } from "./buffered.js";
import type { PushReadableStreamController } from "./push-readable.js";
import type {
    ReadableStream,
    ReadableStreamDefaultController,
    ReadableStreamDefaultReader,
    WritableStreamDefaultWriter,
} from "./stream.js";

export function tryClose(
    controller: PushReadableStreamController<unknown>,
): boolean;
export function tryClose(
    controller: ReadableStreamDefaultController<unknown>,
): boolean;
export function tryClose(writer: WritableStreamDefaultWriter<never>): boolean;
export function tryClose(controller: { close(): void }) {
    try {
        controller.close();
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
