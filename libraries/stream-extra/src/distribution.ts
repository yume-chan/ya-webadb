import { ConsumableTransformStream } from "./consumable.js";

/**
 * Splits or combines buffers to specified size.
 */
export class BufferCombiner {
    private _capacity: number;
    private readonly _buffer: Uint8Array;
    private _offset: number;
    private _available: number;

    public constructor(size: number) {
        this._capacity = size;
        this._buffer = new Uint8Array(size);
        this._offset = 0;
        this._available = size;
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

        if (this._offset !== 0) {
            if (available >= this._available) {
                this._buffer.set(
                    data.subarray(0, this._available),
                    this._offset
                );
                offset += this._available;
                available -= this._available;

                yield this._buffer;
                this._offset = 0;
                this._available = this._capacity;

                if (available === 0) {
                    return;
                }
            } else {
                this._buffer.set(data, this._offset);
                this._offset += available;
                this._available -= available;
                return;
            }
        }

        while (available >= this._capacity) {
            const end = offset + this._capacity;
            yield data.subarray(offset, end);
            offset = end;
            available -= this._capacity;
        }

        if (available > 0) {
            this._buffer.set(data.subarray(offset), this._offset);
            this._offset += available;
            this._available -= available;
        }
    }

    public flush(): Uint8Array | undefined {
        if (this._offset === 0) {
            return undefined;
        }

        const output = this._buffer.subarray(0, this._offset);
        this._offset = 0;
        this._available = this._capacity;
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
