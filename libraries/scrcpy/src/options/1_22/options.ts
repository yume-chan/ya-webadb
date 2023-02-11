import { type ReadableStream } from "@yume-chan/stream-extra";
import { type ValueOrPromise } from "@yume-chan/struct";

import { type ScrcpyScrollController } from "../1_16/index.js";
import { ScrcpyOptions1_21, type ScrcpyOptionsInit1_21 } from "../1_21.js";
import { type ScrcpyVideoStreamMetadata } from "../types.js";

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
        return Object.assign(super.getDefaultValue(), {
            downsizeOnError: true,
            sendDeviceMeta: true,
            sendDummyByte: true,
            rawVideoStream: false,
        } satisfies Omit<ScrcpyOptionsInit1_22, keyof ScrcpyOptionsInit1_21>);
    }

    public override parseVideoStreamMetadata(
        stream: ReadableStream<Uint8Array>
    ): ValueOrPromise<[ReadableStream<Uint8Array>, ScrcpyVideoStreamMetadata]> {
        const sendDeviceMeta =
            this.value.sendDeviceMeta ?? this.getDefaultValue().sendDeviceMeta;
        if (!sendDeviceMeta) {
            return [stream, {}];
        } else {
            return super.parseVideoStreamMetadata(stream);
        }
    }

    public override getScrollController(): ScrcpyScrollController {
        return new ScrcpyScrollController1_22();
    }
}
