import type { ReadableStream } from "@yume-chan/stream-extra";
import type { ValueOrPromise } from "@yume-chan/struct";

import type { ScrcpyScrollController } from "../1_16/index.js";
import { ScrcpyOptions1_21 } from "../1_21.js";
import type { ScrcpyVideoStream } from "../codec.js";
import { ScrcpyVideoCodecId } from "../codec.js";
import { ScrcpyOptionsBase } from "../types.js";

import type { ScrcpyOptionsInit1_22 } from "./init.js";
import { ScrcpyScrollController1_22 } from "./scroll.js";

export class ScrcpyOptions1_22 extends ScrcpyOptionsBase<
    ScrcpyOptionsInit1_22,
    ScrcpyOptions1_21
> {
    public static readonly DEFAULTS = {
        ...ScrcpyOptions1_21.DEFAULTS,
        downsizeOnError: true,
        sendDeviceMeta: true,
        sendDummyByte: true,
    } as const satisfies Required<ScrcpyOptionsInit1_22>;

    public override get defaults(): Required<ScrcpyOptionsInit1_22> {
        return ScrcpyOptions1_22.DEFAULTS;
    }

    public constructor(init: ScrcpyOptionsInit1_22) {
        super(new ScrcpyOptions1_21(init), {
            ...ScrcpyOptions1_22.DEFAULTS,
            ...init,
        });
    }

    public override parseVideoStreamMetadata(
        stream: ReadableStream<Uint8Array>
    ): ValueOrPromise<ScrcpyVideoStream> {
        if (!this.value.sendDeviceMeta) {
            return { stream, metadata: { codec: ScrcpyVideoCodecId.H264 } };
        } else {
            return this._base.parseVideoStreamMetadata(stream);
        }
    }

    public override serialize(): string[] {
        return ScrcpyOptions1_21.serialize(this.value, this.defaults);
    }

    public override createScrollController(): ScrcpyScrollController {
        return new ScrcpyScrollController1_22();
    }
}
