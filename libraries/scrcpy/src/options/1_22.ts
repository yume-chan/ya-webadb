import { Adb } from "@yume-chan/adb";
import Struct from "@yume-chan/struct";
import { ScrcpyClientConnection, ScrcpyClientConnectionOptions, ScrcpyClientForwardConnection, ScrcpyClientReverseConnection } from "../connection";
import { ScrcpyInjectScrollControlMessage1_16 } from "./1_16";
import { ScrcpyOptions1_21, type ScrcpyOptionsInit1_21 } from "./1_21";

export interface ScrcpyOptionsInit1_22 extends ScrcpyOptionsInit1_21 {
    downsizeOnError: boolean;

    /**
     * Send device name and size
     *
     * @default true
     */
    sendDeviceMeta: boolean;

    /**
     * Write a byte on start to detect connection issues
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
        const defaultValue = this.getDefaultValue();
        const options: ScrcpyClientConnectionOptions = {
            control: this.value.control ?? defaultValue.control,
            sendDummyByte: this.value.sendDummyByte ?? defaultValue.sendDummyByte,
            sendDeviceMeta: this.value.sendDeviceMeta ?? defaultValue.sendDeviceMeta,
        };
        if (this.value.tunnelForward) {
            return new ScrcpyClientForwardConnection(device, options);
        } else {
            return new ScrcpyClientReverseConnection(device, options);
        }
    }

    public override serializeInjectScrollControlMessage(
        message: ScrcpyInjectScrollControlMessage1_22,
    ): ArrayBuffer {
        return ScrcpyInjectScrollControlMessage1_22.serialize(message);
    }
}
