import { PromiseResolver } from '@yume-chan/async-operation-manager';
import { EventEmitter } from '@yume-chan/event';

const IteratorReturnUndefinedResult: IteratorReturnResult<void> = {
    done: true,
    value: undefined,
};
Object.freeze(IteratorReturnUndefinedResult);

export type EventIteratorDestroyer<T> = (items: T[]) => void;

export class EventIteratorState<T> {
    public pullQueue: PromiseResolver<IteratorResult<T>>[] = [];

    public pushQueue: [value: T, size: number][] = [];

    public ended = false;

    public waterMark = 0;

    public pendingLowWaterEvent = false;

    public lowWaterEvent = new EventEmitter<void>();

    public get onLowWater() { return this.lowWaterEvent.event; }

    public cleanup!: EventIteratorDestroyer<T>;
}

export class EventIteratorController<T> {
    private state: EventIteratorState<T>;

    public maxConsumerCount = Infinity;

    public highWaterMark: number = 10;

    public lowWaterMark: number = 0;

    public get waterMark() { return this.state.waterMark; }

    public get onLowWater() { return this.state.lowWaterEvent.event; }

    public constructor(state: EventIteratorState<T>) {
        this.state = state;
    }

    public push(value: T, size = 1): boolean {
        if (this.state.pullQueue.length) {
            this.state.pullQueue.shift()!.resolve({ done: false, value });
            return true;
        }

        this.state.pushQueue.push([value, size]);
        this.state.waterMark += size;
        if (this.state.waterMark < this.highWaterMark) {
            return true;
        }

        this.state.pendingLowWaterEvent = true;
        return false;
    }

    public end(): void {
        this.state.ended = true;
        while (this.state.pullQueue.length) {
            this.state.pullQueue.shift()!.resolve(IteratorReturnUndefinedResult);
        }
        this.state.cleanup(this.state.pushQueue.map(([value]) => value));
    }
}

export interface EventIteratorInitializer<T> {
    (controller: EventIteratorController<T>): EventIteratorDestroyer<T>;
}

export class EventIterable<T> implements AsyncIterable<T> {
    private initializer: EventIteratorInitializer<T>;

    public constructor(initializer: EventIteratorInitializer<T>) {
        this.initializer = initializer;
    }

    public [Symbol.asyncIterator](): AsyncIterator<T> {
        const state = new EventIteratorState<T>();
        const controller = new EventIteratorController<T>(state);
        state.cleanup = this.initializer(controller);
        return {
            next() {
                if (state.pushQueue.length) {
                    const [value, size] = state.pushQueue.shift()!;
                    state.waterMark -= size;
                    if (state.pendingLowWaterEvent &&
                        state.waterMark <= controller.lowWaterMark) {
                        state.lowWaterEvent.fire();
                    }
                    return Promise.resolve({ done: false, value });
                }

                if (state.ended) {
                    return Promise.resolve(IteratorReturnUndefinedResult);
                }

                if (state.pullQueue.length < controller.maxConsumerCount) {
                    const resolver = new PromiseResolver<IteratorResult<T>>();
                    state.pullQueue.push(resolver);
                    return resolver.promise;
                }

                return Promise.reject(new Error('Max consumer count exceeded'));
            },
            return() {
                controller.end();
                return Promise.resolve(IteratorReturnUndefinedResult);
            },
        };
    }
}
