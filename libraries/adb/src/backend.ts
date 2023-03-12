import type { Consumable, ReadableWritablePair } from "@yume-chan/stream-extra";
import type { ValueOrPromise } from "@yume-chan/struct";

import type { AdbPacketData, AdbPacketInit } from "./packet.js";

export interface AdbBackend {
    readonly serial: string;

    readonly name: string | undefined;

    connect(): ValueOrPromise<
        ReadableWritablePair<AdbPacketData, Consumable<AdbPacketInit>>
    >;
}
