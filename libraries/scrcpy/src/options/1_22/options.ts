import type { ScrcpyScrollController } from "../1_16/index.js";
import type { ScrcpyOptionsInit1_21 } from "../1_21.js";
import { ScrcpyOptions1_21 } from "../1_21.js";

import { ScrcpyScrollController1_22 } from "./scroll.js";

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

export class ScrcpyOptions1_22<
    T extends ScrcpyOptionsInit1_22 = ScrcpyOptionsInit1_22
> extends ScrcpyOptions1_21<T> {
    public constructor(init: Partial<ScrcpyOptionsInit1_22>) {
        if (init.rawVideoStream) {
            // Set implied options for client-side processing
            init.sendDeviceMeta = false;
            init.sendFrameMeta = false;
            init.sendDummyByte = false;
        }

        super(init);
    }

    public override getDefaultValue(): T {
        return {
            ...super.getDefaultValue(),
            downsizeOnError: true,
            sendDeviceMeta: true,
            sendDummyByte: true,
            rawVideoStream: false,
        };
    }

    public override getScrollController(): ScrcpyScrollController {
        return new ScrcpyScrollController1_22();
    }
}
