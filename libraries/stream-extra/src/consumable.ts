import { PromiseResolver, isPromiseLike } from "@yume-chan/async";

import type {
    ConsumableReadableStreamController,
    ConsumableReadableStreamSource,
    ConsumableWritableStreamSink,
} from "./consumable/index.js";
import {
    ConsumableReadableStream,
    ConsumableWrapByteReadableStream,
    ConsumableWrapWritableStream,
    ConsumableWritableStream,
} from "./consumable/index.js";
import type { Task } from "./task.js";
import { createTask } from "./task.js";

export class Consumable<T> {
    static readonly WritableStream = ConsumableWritableStream;
    static readonly WrapWritableStream = ConsumableWrapWritableStream;
    static readonly ReadableStream = ConsumableReadableStream;
    static readonly WrapByteReadableStream = ConsumableWrapByteReadableStream;

    readonly #task: Task;
    readonly #resolver: PromiseResolver<void>;

    readonly value: T;
    readonly consumed: Promise<void>;

    constructor(value: T) {
        this.#task = createTask("Consumable");
        this.value = value;
        this.#resolver = new PromiseResolver<void>();
        this.consumed = this.#resolver.promise;
    }

    consume() {
        this.#resolver.resolve();
    }

    error(error: unknown) {
        this.#resolver.reject(error);
    }

    tryConsume<U>(callback: (value: T) => U) {
        try {
            let result = this.#task.run(() => callback(this.value));
            if (isPromiseLike(result)) {
                result = result.then(
                    (value) => {
                        this.#resolver.resolve();
                        return value;
                    },
                    (e) => {
                        this.#resolver.reject(e);
                        throw e;
                    },
                ) as U;
            } else {
                this.#resolver.resolve();
            }
            return result;
        } catch (e) {
            this.#resolver.reject(e);
            throw e;
        }
    }
}

export namespace Consumable {
    export type WritableStreamSink<T> = ConsumableWritableStreamSink<T>;
    export type WritableStream<in T> = typeof ConsumableWritableStream<T>;

    export type WrapWritableStream<in T> =
        typeof ConsumableWrapWritableStream<T>;

    export type ReadableStreamController<T> =
        ConsumableReadableStreamController<T>;
    export type ReadableStreamSource<T> = ConsumableReadableStreamSource<T>;
    export type ReadableStream<T> = typeof ConsumableReadableStream<T>;

    export type WrapByteReadableStream =
        typeof ConsumableWrapByteReadableStream;
}
