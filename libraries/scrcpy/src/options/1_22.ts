import type { Adb } from "@yume-chan/adb";
import Struct from "@yume-chan/struct";
import { ScrcpyClientForwardConnection, ScrcpyClientReverseConnection, type ScrcpyClientConnection } from "../connection.js";
import { ScrcpyInjectScrollControlMessage1_16 } from "./1_16/index.js";
import { ScrcpyOptions1_21, type ScrcpyOptionsInit1_21 } from "./1_21.js";

export interface ScrcpyOptionsInit1_22 extends ScrcpyOptionsInit1_21 {
    downsizeOnError: boolean;

    /**
     * Send device name and size at start of video stream.
     *
     * @default true
     */
    sendDeviceMeta: boolean;

    /**
     * Send a `0` byte on start of video stream to detect connection issues
     *
     * @default true
     */
    sendDummyByte: boolean;

    /**
     * Implies `sendDeviceMeta: false`, `sendFrameMeta: false` and `sendDummyByte: false`
     *
     * @default false
     */
    rawVideoStream: boolean;
}

export const ScrcpyInjectScrollControlMessage1_22 =
    new Struct()
        .fields(ScrcpyInjectScrollControlMessage1_16)
        .int32("buttons");

export type ScrcpyInjectScrollControlMessage1_22 = typeof ScrcpyInjectScrollControlMessage1_22["TInit"];

export class ScrcpyOptions1_22<T extends ScrcpyOptionsInit1_22 = ScrcpyOptionsInit1_22> extends ScrcpyOptions1_21<T> {
    public constructor(init: Partial<ScrcpyOptionsInit1_22>) {
        if (init.rawVideoStream) {
            // Set implied options for client-side processing
            init.sendDeviceMeta = false;
            init.sendFrameMeta = false;
            init.sendDummyByte = false;
        }

        super(init);
    }

    protected override getDefaultValue(): T {
        return {
            ...super.getDefaultValue(),
            downsizeOnError: true,
            sendDeviceMeta: true,
            sendDummyByte: true,
            rawVideoStream: false,
        };
    }

    public override createConnection(device: Adb): ScrcpyClientConnection {
        const options = {
            ...this.getDefaultValue(),
            ...this.value,
        };
        if (this.value.tunnelForward) {
            return new ScrcpyClientForwardConnection(device, options);
        } else {
            return new ScrcpyClientReverseConnection(device, options);
        }
    }

    public override serializeInjectScrollControlMessage(
        message: ScrcpyInjectScrollControlMessage1_22,
    ): Uint8Array {
        return ScrcpyInjectScrollControlMessage1_22.serialize(message);
    }
}
