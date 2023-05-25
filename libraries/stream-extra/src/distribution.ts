import { ConsumableTransformStream } from "./consumable.js";

/**
 * Splits or combines buffers to specified size.
 */
export class BufferCombiner {
    #capacity: number;
    readonly #buffer: Uint8Array;
    #offset: number;
    #available: number;

    public constructor(size: number) {
        this.#capacity = size;
        this.#buffer = new Uint8Array(size);
        this.#offset = 0;
        this.#available = size;
    }

    /**
     * Pushes data to the combiner.
     * @param data The input data to be split or combined.
     * @returns
     * A generator that yields buffers of specified size.
     * It may yield the same buffer multiple times, consume the data before calling `next`.
     */
    public *push(data: Uint8Array): Generator<Uint8Array, void, void> {
        let offset = 0;
        let available = data.byteLength;

        if (this.#offset !== 0) {
            if (available >= this.#available) {
                this.#buffer.set(
                    data.subarray(0, this.#available),
                    this.#offset
                );
                offset += this.#available;
                available -= this.#available;

                yield this.#buffer;
                this.#offset = 0;
                this.#available = this.#capacity;

                if (available === 0) {
                    return;
                }
            } else {
                this.#buffer.set(data, this.#offset);
                this.#offset += available;
                this.#available -= available;
                return;
            }
        }

        while (available >= this.#capacity) {
            const end = offset + this.#capacity;
            yield data.subarray(offset, end);
            offset = end;
            available -= this.#capacity;
        }

        if (available > 0) {
            this.#buffer.set(data.subarray(offset), this.#offset);
            this.#offset += available;
            this.#available -= available;
        }
    }

    public flush(): Uint8Array | undefined {
        if (this.#offset === 0) {
            return undefined;
        }

        const output = this.#buffer.subarray(0, this.#offset);
        this.#offset = 0;
        this.#available = this.#capacity;
        return output;
    }
}

export class DistributionStream extends ConsumableTransformStream<
    Uint8Array,
    Uint8Array
> {
    public constructor(size: number, combine = false) {
        const combiner = combine ? new BufferCombiner(size) : undefined;
        super({
            async transform(chunk, controller) {
                if (combiner) {
                    for (const buffer of combiner.push(chunk)) {
                        await controller.enqueue(buffer);
                    }
                } else {
                    let offset = 0;
                    let available = chunk.byteLength;
                    while (available > 0) {
                        const end = offset + size;
                        await controller.enqueue(chunk.subarray(offset, end));
                        offset = end;
                        available -= size;
                    }
                }
            },
            async flush(controller) {
                if (combiner) {
                    const data = combiner.flush();
                    if (data) {
                        await controller.enqueue(data);
                    }
                }
            },
        });
    }
}
