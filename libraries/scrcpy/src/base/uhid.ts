import type { ReadableStream } from "@yume-chan/stream-extra";

import type { ScrcpyUHidOutputDeviceMessage } from "../latest.js";

export interface ScrcpyUHidManager {
    createDevice(device: {
        name: string;
        vendorId: number;
        productId: number;
        descriptor: Uint8Array;
    }): Promise<ScrcpyUHidDevice>;

    close?(): Promise<undefined>;
}

export interface ScrcpyUHidDevice {
    readonly id: number;

    readonly output: ReadableStream<ScrcpyUHidOutputDeviceMessage>;

    readonly name?: string;

    readonly productId?: number;
    readonly vendorId?: number;

    readonly destroyed?: boolean;

    sendReport(report: Uint8Array): Promise<undefined>;

    destroy?(): Promise<undefined>;
}
