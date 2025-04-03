import type { MaybePromiseLike } from "@yume-chan/async";
import type { Event } from "@yume-chan/event";

export interface DeviceObserver<T> {
    readonly onDeviceAdd: Event<readonly T[]>;
    readonly onDeviceRemove: Event<readonly T[]>;
    readonly onListChange: Event<readonly T[]>;
    readonly current: readonly T[];
    stop(): MaybePromiseLike<void>;
}
