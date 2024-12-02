import type { MaybePromiseLike } from "@yume-chan/async";
import type { Event } from "@yume-chan/event";

export interface DeviceObserver<T> {
    onDeviceAdd: Event<T[]>;
    onDeviceRemove: Event<T[]>;
    onListChange: Event<T[]>;
    current: T[];
    stop(): MaybePromiseLike<void>;
}
