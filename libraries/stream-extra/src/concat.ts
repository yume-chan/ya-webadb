import { PromiseResolver } from "@yume-chan/async";
import { EmptyUint8Array } from "@yume-chan/struct";

import type { ReadableWritablePair } from "./stream.js";
import { ReadableStream, WritableStream } from "./stream.js";

// `TransformStream` only calls its `source.flush` method when its `readable` is being read.
// If the user wants to use the `Promise` interface, the `flush` method will never be called,
// so the `PromiseResolver` will never be resolved.
// Thus we need to implement our own `TransformStream` using a `WritableStream` and a `ReadableStream`.
export class AccumulateStream<
    Input,
    Output,
    Accumulated = Output,
> implements ReadableWritablePair<Output, Input> {
    #current: Accumulated;

    #write: (chunk: Input, current: Accumulated) => Accumulated;
    #finalize: (current: Accumulated) => Output;

    #resolver = new PromiseResolver<Output>();

    #writable = new WritableStream<Input>({
        write: (chunk) => {
            try {
                this.#current = this.#write(chunk, this.#current);
            } catch (e) {
                this.#resolver.reject(e);
                throw e;
            }
        },
        close: () => {
            try {
                const output = this.#finalize(this.#current);
                this.#resolver.resolve(output);
            } catch (e) {
                this.#resolver.reject(e);
                throw e;
            }
        },
        abort: (reason) => {
            this.#resolver.reject(reason);
        },
    });
    get writable() {
        return this.#writable;
    }

    #readable = new ReadableStream<Output>(
        {
            pull: async (controller) => {
                const output = await this.#resolver.promise;
                controller.enqueue(output);
                controller.close();
            },
            // Ignore `abort` event since the user might use the `Promise` interface.
        },
        // `highWaterMark: 0` makes the `pull` method
        // only be called when the `ReadableStream` is being read.
        // If the user only uses the `Promise` interface,
        // it's unnecessary to run the `pull` method.
        { highWaterMark: 0 },
    ) as ReadableStream<Output> &
        Omit<Promise<Output>, typeof Symbol.toStringTag>;
    get readable() {
        return this.#readable;
    }

    constructor(
        initial: Accumulated,
        write: (chunk: Input, current: Accumulated) => Accumulated,
        finalize: (current: Accumulated) => Output,
    ) {
        this.#current = initial;
        this.#write = write;
        this.#finalize = finalize;

        // biome-ignore lint/suspicious/noThenProperty: This object is intentionally thenable
        this.#readable.then = (onfulfilled, onrejected) => {
            return this.#resolver.promise.then(onfulfilled, onrejected);
        };
        // biome-ignore lint/suspicious/noThenProperty: This object is intentionally thenable
        this.#readable.catch = (onrejected) => {
            return this.#resolver.promise.catch(onrejected);
        };
        // biome-ignore lint/suspicious/noThenProperty: This object is intentionally thenable
        this.#readable.finally = (onfinally) => {
            return this.#resolver.promise.finally(onfinally);
        };
    }
}

/**
 * A `TransformStream` that concatenates strings.
 *
 * Its `readable` is also a Promise-like, that can be `await`ed to get the result.
 *
 * ```ts
 * const result: string = await readable.pipeThrough(new ConcatStringStream());
 * ```
 */
export class ConcatStringStream extends AccumulateStream<string, string> {
    constructor() {
        // PERF: rope (concat strings) is faster than `[].join('')`
        super(
            "",
            (chunk, current) => current + chunk,
            (output) => output,
        );
    }
}

/**
 * Concatenate all chunks into a single `Uint8Array`.
 *
 * If there is only one chunk, it will be returned directly.
 * @param chunks An array of `Uint8Array`s to concatenate
 * @returns An `Uint8Array` containing all chunks. If there is only one chunk, it will be returned directly.
 */
export function concatUint8Arrays(chunks: readonly Uint8Array[]): Uint8Array {
    switch (chunks.length) {
        case 0:
            return EmptyUint8Array;
        case 1:
            return chunks[0]!;
    }

    const length = chunks.reduce((a, b) => a + b.length, 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
        output.set(chunk, offset);
        offset += chunk.length;
    }
    return output;
}

/**
 * A `TransformStream` that concatenates `Uint8Array`s.
 *
 * Its `readable` is also a Promise-like, that can be `await`ed to get the result.
 *
 * To convert a `ReadableStream<Uint8Array>` to a string,
 * prefer `.pipeThrough(new TextDecoderStream()).pipeThrough(new ConcatStringStream())`,
 * to `.pipeThrough(new ConcatBufferStream()).pipeThrough(new TextDecoderStream())`.
 * Because of JavaScript engine optimizations,
 * concatenating strings is faster than concatenating `Uint8Array`s.
 */
export class ConcatBufferStream extends AccumulateStream<
    Uint8Array,
    Uint8Array,
    Uint8Array[]
> {
    constructor() {
        super(
            [],
            (chunk, current) => {
                current.push(chunk);
                return current;
            },
            (current) => {
                const result = concatUint8Arrays(current);
                // `current` is no longer needed. Clear it to free memory.
                current.length = 0;
                return result;
            },
        );
    }
}
