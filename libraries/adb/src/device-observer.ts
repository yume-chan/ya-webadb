import type { Event } from "@yume-chan/event";

import type { Closeable } from "./adb.js";

export interface DeviceObserver<T> extends Closeable {
    readonly onDeviceAdd: Event<readonly T[]>;
    readonly onDeviceRemove: Event<readonly T[]>;
    readonly onListChange: Event<readonly T[]>;
    readonly current: readonly T[];
}
