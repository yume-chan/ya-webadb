import { PromiseResolver } from '@yume-chan/async-operation-manager';
import { EventEmitter } from '@yume-chan/event';

const IteratorReturnUndefinedResult: IteratorReturnResult<void> = {
    done: true,
    value: undefined,
};
Object.freeze(IteratorReturnUndefinedResult);

export type EventIteratorDestroyer<_T> = (() => void) | undefined;

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
        let item: PromiseResolver<IteratorResult<T, any>> | undefined;
        while (item = this.state.pullQueue.shift()) {
            item.resolve(IteratorReturnUndefinedResult);
        }
        this.state.cleanup?.();
    }
}

export interface EventIteratorInitializer<T> {
    (controller: EventIteratorController<T>): EventIteratorDestroyer<T>;
}

export interface EventIteratorOptions {
    maxConsumerCount: number;

    autoCleanup: boolean;

    autoStart: boolean;
}

export const EventIteratorDefaultOptions: EventIteratorOptions = {
    maxConsumerCount: Infinity,
    autoCleanup: true,
    autoStart: true,
};

export class EventIterable<T> implements AsyncIterable<T> {
    private initializer: EventIteratorInitializer<T>;

    private options: EventIteratorOptions;

    private consumerCount: number = 0;

    private state: EventIteratorState<T>;

    private controller: EventIteratorController<T>;

    private started = false;

    public constructor(
        initializer: EventIteratorInitializer<T>,
        options?: Partial<EventIteratorOptions>
    ) {
        this.initializer = initializer;
        this.options = { ...EventIteratorDefaultOptions, ...options };

        this.state = new EventIteratorState<T>();
        this.controller = new EventIteratorController<T>(this.state);

        if (this.options.autoStart) {
            this.state.cleanup = this.initializer(this.controller);
        }
    }

    private next = () => {
        const { state, controller } = this;

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

        const resolver = new PromiseResolver<IteratorResult<T>>();
        state.pullQueue.push(resolver);
        return resolver.promise;
    };

    public [Symbol.asyncIterator](): AsyncIterator<T> {
        if (this.consumerCount === this.options.maxConsumerCount) {
            throw new Error('Max consumer count exceeded');
        }
        this.consumerCount += 1;

        if (!this.options.autoStart && !this.started) {
            this.state.cleanup = this.initializer(this.controller);
            this.started = true;
        }

        return {
            next: this.next,
            return: () => {
                this.consumerCount -= 1;
                if (this.consumerCount === 0 && this.options.autoCleanup) {
                    this.controller.end();
                }
                return Promise.resolve(IteratorReturnUndefinedResult);
            },
        };
    }
}
