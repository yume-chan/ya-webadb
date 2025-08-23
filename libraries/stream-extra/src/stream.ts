import type { AbortSignal, ReadableStreamIteratorOptions } from "./types.js";

export * from "./types.js";
export { ReadableStream };

/** A controller object that allows you to abort one or more DOM requests as and when desired. */
export interface AbortController {
    /**
     * Returns the AbortSignal object associated with this object.
     */
    readonly signal: AbortSignal;

    /**
     * Invoking this method will set this object's AbortSignal's aborted flag and signal to any observers that the associated activity is to be aborted.
     */
    abort(reason?: unknown): void;
}

interface AbortControllerConstructor {
    prototype: AbortController;
    new (): AbortController;
}

type ReadableStreamType<T> = typeof globalThis extends {
    ReadableStream: unknown;
}
    ? // @ts-expect-error Just do it
      globalThis.ReadableStream<T>
    : // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      import("./types.js").ReadableStream<T>;

type ReadableStreamConstructor = typeof globalThis extends {
    ReadableStream: unknown;
}
    ? // @ts-expect-error Just do it
      typeof globalThis.ReadableStream
    : // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      typeof import("./types.js").ReadableStream;

type WritableStreamType<T> = typeof globalThis extends {
    WritableStream: unknown;
}
    ? // @ts-expect-error Just do it
      globalThis.WritableStream<T>
    : // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      import("./types.js").WritableStream<T>;

type WritableStreamConstructor = typeof globalThis extends {
    WritableStream: unknown;
}
    ? // @ts-expect-error Just do it
      typeof globalThis.WritableStream
    : // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      typeof import("./types.js").WritableStream;

type TransformStreamType<I, O> = typeof globalThis extends {
    TransformStream: unknown;
}
    ? // @ts-expect-error Just do it
      globalThis.TransformStream<I, O>
    : // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      import("./types.js").TransformStream<I, O>;

type TransformStreamConstructor = typeof globalThis extends {
    TransformStream: unknown;
}
    ? // @ts-expect-error Just do it
      typeof globalThis.TransformStream
    : // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      typeof import("./types.js").TransformStream;

interface GlobalExtension {
    AbortController: AbortControllerConstructor;
    ReadableStream: ReadableStreamConstructor;
    WritableStream: WritableStreamConstructor;
    TransformStream: TransformStreamConstructor;
}

export const { AbortController } = globalThis as unknown as GlobalExtension;

export type ReadableStream<T> = ReadableStreamType<T>;
export type WritableStream<T> = WritableStreamType<T>;
export type TransformStream<I, O> = TransformStreamType<I, O>;

const ReadableStream = /* #__PURE__ */ ((): ReadableStreamConstructor => {
    const { ReadableStream } = globalThis as unknown as GlobalExtension;

    if (!ReadableStream.from) {
        ReadableStream.from = function (iterable) {
            const iterator =
                Symbol.asyncIterator in iterable
                    ? iterable[Symbol.asyncIterator]()
                    : iterable[Symbol.iterator]();

            return new ReadableStream({
                async pull(controller) {
                    const result = await iterator.next();
                    if (result.done) {
                        controller.close();
                        return;
                    }
                    controller.enqueue(result.value);
                },
                async cancel(reason) {
                    await iterator.return?.(reason);
                },
            });
        };
    }

    if (
        !ReadableStream.prototype[Symbol.asyncIterator] ||
        !ReadableStream.prototype.values
    ) {
        ReadableStream.prototype.values = async function* <R>(
            this: ReadableStream<R>,
            options?: ReadableStreamIteratorOptions,
        ) {
            const reader = this.getReader();
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        return;
                    }
                    yield value;
                }
            } finally {
                // Calling `iterator.return` will enter this `finally` block.
                // We don't need to care about the parameter to `iterator.return`,
                // it will be returned as the final `result.value` automatically.
                if (!options?.preventCancel) {
                    await reader.cancel();
                }
                reader.releaseLock();
            }
        };

        ReadableStream.prototype[Symbol.asyncIterator] =
            // eslint-disable-next-line @typescript-eslint/unbound-method
            ReadableStream.prototype.values;
    }

    return ReadableStream;
})();

export const { WritableStream, TransformStream } =
    globalThis as unknown as GlobalExtension;
