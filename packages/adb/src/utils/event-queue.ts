import { PromiseResolver } from '@yume-chan/async-operation-manager';
import { EventEmitter } from '@yume-chan/event';

export interface EventQueueOptions {
    maxWaitCount: number;

    highWaterMark: number;

    lowWaterMark: number;
}

export const EventQueueDefaultOptions: EventQueueOptions = {
    maxWaitCount: Infinity,
    highWaterMark: 10,
    lowWaterMark: 0,
};

interface LinkedListItem<T> {
    value: T;

    next?: LinkedListItem<T>;
}

class LinkedList<T>{
    private head?: LinkedListItem<T>;

    private tail?: LinkedListItem<T>;

    private _length = 0;
    public get length() { return this._length; }

    public push(value: T): void {
        const item: LinkedListItem<T> = { value };

        if (this._length === 0) {
            this.head = item;
        } else {
            this.tail!.next = item;
        }

        this._length += 1;
        this.tail = item;
    }

    public shift(): T | undefined {
        if (this._length === 0) {
            return;
        }

        const { next, value } = this.head!;
        if (!next) {
            this.tail = undefined;
        }

        this.head = next;
        this._length -= 1;
        return value;
    }
}

/**
 * Basically an object-mode ReadableStream with Promise-based API
 *
 * It's called `EventQueue` because it usually converts events ("push system") to "pull system"
 *
 * https://github.com/nodejs/node/blob/master/lib/internal/streams/readable.js
 */
export class EventQueue<T> {
    // Use linked lists for faster shift operation.

    /** Already buffered data ready to be served to consumers */
    private buffers = new LinkedList<[value: T, size: number]>();

    /** Waiting consumers because lack of data */
    private awaiters = new LinkedList<PromiseResolver<T>>();

    private options: EventQueueOptions;

    private ended = false;

    private _length = 0;
    public get length() { return this._length; }

    private _needDrain = false;
    public get needDrain() { return this._needDrain; }

    private readonly drainEvent = new EventEmitter<void>();
    public readonly onDrain = this.drainEvent.event;

    public constructor(options?: Partial<EventQueueOptions>) {
        this.options = { ...EventQueueDefaultOptions, ...options };
    }

    public enqueue(value: T, length = 1): boolean {
        if (this.ended) {
            return true;
        }

        if (this.awaiters.length) {
            this.awaiters.shift()!.resolve(value);
            return true;
        }

        this.buffers.push([value, length]);
        this._length += length;
        if (this._length < this.options.highWaterMark) {
            return true;
        }

        this._needDrain = true;
        return false;
    }

    public dequeue(): Promise<T> {
        if (this.buffers.length) {
            const [value, size] = this.buffers.shift()!;
            this._length -= size;
            if (this._needDrain &&
                this._length <= this.options.lowWaterMark) {
                this.drainEvent.fire();
            }
            return Promise.resolve(value);
        }

        if (this.ended) {
            return Promise.reject(new Error('The EventQueue has already ended'));
        }

        if (this.awaiters.length === this.options.maxWaitCount - 1) {
            throw new Error('Max wait count exceeded');
        }

        const resolver = new PromiseResolver<T>();
        this.awaiters.push(resolver);
        return resolver.promise;
    }

    public end(): void {
        this.ended = true;
        let item: PromiseResolver<T> | undefined;
        while (item = this.awaiters.shift()) {
            item.reject(new Error('The EventQueue has already ended'));
        }
    }
}
