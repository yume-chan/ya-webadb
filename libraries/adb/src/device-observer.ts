import type { Event } from "@yume-chan/event";
import type { MaybePromiseLike } from "@yume-chan/struct";

export interface DeviceObserver<T> {
    deviceAdded: Event<T[]>;
    deviceRemoved: Event<T[]>;
    listChanged: Event<T[]>;
    current: T[];
    stop(): MaybePromiseLike<void>;
}
