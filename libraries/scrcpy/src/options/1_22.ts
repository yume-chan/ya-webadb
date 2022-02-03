import Struct from "@yume-chan/struct";
import { ScrcpyInjectScrollControlMessage1_16 } from "./1_16";
import { ScrcpyOptions1_21, ScrcpyOptions1_21Type } from "./1_21";

export interface ScrcpyOptions1_22Type extends ScrcpyOptions1_21Type {
    downsizeOnError: boolean;

    /**
     * Send device name and size
     *
     * TODO: This is not implemented yet
     */
    sendDeviceMeta: boolean;

    /**
     * Write a byte on start to detect connection issues
     *
     * TODO: This is not implemented yet
     */
    sendDummyByte: boolean;

    /**
     * Implies `sendDeviceMeta: false`, `sendFrameMeta: false` and `sendDummyByte: false`
     *
     * TODO: This is not implemented yet
     */
    rawVideoStream: boolean;
}

export const ScrcpyInjectScrollControlMessage1_22 =
    new Struct()
        .fields(ScrcpyInjectScrollControlMessage1_16)
        .int32("buttons");

export type ScrcpyInjectScrollControlMessage1_22 = typeof ScrcpyInjectScrollControlMessage1_22["TInit"];

export class ScrcpyOptions1_22<T extends ScrcpyOptions1_22Type = ScrcpyOptions1_22Type> extends ScrcpyOptions1_21<T> {
    public constructor(init: Partial<ScrcpyOptions1_22Type>) {
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

    public override serializeInjectScrollControlMessage(
        message: ScrcpyInjectScrollControlMessage1_22,
    ): ArrayBuffer {
        return ScrcpyInjectScrollControlMessage1_22.serialize(message);
    }
}
