import type { ReadableStream } from "@yume-chan/stream-extra";
import type { ValueOrPromise } from "@yume-chan/struct";

import type { ScrcpyScrollController } from "../1_16/index.js";
import { ScrcpyOptions1_21 } from "../1_21.js";
import type { ScrcpyVideoStream } from "../codec.js";
import { ScrcpyOptionsBase } from "../types.js";

import type { ScrcpyOptionsInit1_22 } from "./init.js";
import { SCRCPY_OPTIONS_DEFAULT_1_22 } from "./init.js";
import { ScrcpyScrollController1_22 } from "./scroll.js";

export class ScrcpyOptions1_22 extends ScrcpyOptionsBase<
    ScrcpyOptionsInit1_22,
    ScrcpyOptions1_21
> {
    public override get defaults(): Required<ScrcpyOptionsInit1_22> {
        return SCRCPY_OPTIONS_DEFAULT_1_22;
    }

    public constructor(init: ScrcpyOptionsInit1_22) {
        super(new ScrcpyOptions1_21(init), {
            ...SCRCPY_OPTIONS_DEFAULT_1_22,
            ...init,
        });
    }

    public override parseVideoStreamMetadata(
        stream: ReadableStream<Uint8Array>
    ): ValueOrPromise<ScrcpyVideoStream> {
        if (!this.value.sendDeviceMeta) {
            return { stream, metadata: {} };
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
