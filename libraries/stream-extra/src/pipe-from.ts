import { WritableStream, type ReadableWritablePair } from "./stream.js";

/**
 * Create a new `WritableStream` that, when written to, will write that chunk to
 * `pair.writable`, when pipe `pair.readable` to `writable`.
 *
 * It's the opposite of `ReadableStream.pipeThrough`.
 *
 * @param writable The `WritableStream` to write to.
 * @param pair A `TransformStream` that converts chunks.
 * @returns A new `WritableStream`.
 */
export function pipeFrom<W, T>(writable: WritableStream<W>, pair: ReadableWritablePair<W, T>) {
    const writer = pair.writable.getWriter();
    const pipe = pair.readable
        .pipeTo(writable);
    return new WritableStream<T>({
        async write(chunk) {
            await writer.ready;
            await writer.write(chunk);
        },
        async close() {
            await writer.close();
            await pipe;
        }
    });
}
