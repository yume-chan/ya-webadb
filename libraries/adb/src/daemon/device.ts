import type { MaybePromiseLike } from "@yume-chan/async";
import type { Consumable, ReadableWritablePair } from "@yume-chan/stream-extra";

import type { AdbPacketData, AdbPacketInit } from "./packet.js";

export interface AdbDaemonDevice {
    readonly serial: string;

    readonly name: string | undefined;

    connect(): MaybePromiseLike<
        ReadableWritablePair<AdbPacketData, Consumable<AdbPacketInit>>
    >;
}
