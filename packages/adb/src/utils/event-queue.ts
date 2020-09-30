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

export class EventQueue<T> {
    private options: EventQueueOptions;

    private pullQueue: PromiseResolver<T>[] = [];

    private pushQueue: [value: T, size: number][] = [];

    private ended = false;

    private waterMark = 0;

    private pendingLowWaterEvent = false;

    private lowWaterEvent = new EventEmitter<void>();

    public get onLowWater() { return this.lowWaterEvent.event; }

    public constructor(options: Partial<EventQueueOptions> = EventQueueDefaultOptions) {
        this.options = { ...EventQueueDefaultOptions, ...options };
    }

    public push(value: T, size = 1): boolean {
        if (this.ended) {
            return true;
        }

        if (this.pullQueue.length) {
            this.pullQueue.shift()!.resolve(value);
            return true;
        }

        this.pushQueue.push([value, size]);
        this.waterMark += size;
        if (this.waterMark < this.options.highWaterMark) {
            return true;
        }

        this.pendingLowWaterEvent = true;
        return false;
    }

    public next(): Promise<T> {
        if (this.pushQueue.length) {
            const [value, size] = this.pushQueue.shift()!;
            this.waterMark -= size;
            if (this.pendingLowWaterEvent &&
                this.waterMark <= this.options.lowWaterMark) {
                this.lowWaterEvent.fire();
            }
            return Promise.resolve(value);
        }

        if (this.ended) {
            return Promise.reject(new Error('The EventQueue has already ended'));
        }

        if (this.pullQueue.length === this.options.maxWaitCount - 1) {
            throw new Error('Max wait count exceeded');
        }

        const resolver = new PromiseResolver<T>();
        this.pullQueue.push(resolver);
        return resolver.promise;
    }

    public end(): void {
        this.ended = true;
        let item: PromiseResolver<T | undefined> | undefined;
        while (item = this.pullQueue.shift()) {
            item.reject(new Error('The EventQueue has already ended'));
        }
    }
}
