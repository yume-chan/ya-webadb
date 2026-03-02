import type { MaybePromiseLike } from "@yume-chan/async";
import type {
    ScrcpyMediaStreamPacket,
    ScrcpyVideoCodecId,
    ScrcpyVideoSize,
} from "@yume-chan/scrcpy";
import type { WritableStream } from "@yume-chan/stream-extra";

import type { ScrcpyVideoDecoderPerformanceCounterInterface } from "./decoder-counter.js";
import type { ScrcpyVideoDecoderPauseControllerInterface } from "./pause-controller.js";
import type { ScrcpyVideoRendererPerformanceCounterInterface } from "./renderer-counter.js";

export interface ScrcpyVideoDecoderCapability {
    maxProfile?: number;
    maxLevel?: number;
}

export interface ScrcpyVideoDecoder
    extends
        ScrcpyVideoDecoderPerformanceCounterInterface,
        ScrcpyVideoRendererPerformanceCounterInterface,
        ScrcpyVideoDecoderPauseControllerInterface,
        ScrcpyVideoSize {
    readonly type: "software" | "hardware";

    readonly rendererType: "software" | "hardware";

    readonly writable: WritableStream<ScrcpyMediaStreamPacket>;

    dispose?(): MaybePromiseLike<undefined>;
}

export interface ScrcpyVideoDecoderConstructor {
    readonly capabilities: Record<string, ScrcpyVideoDecoderCapability>;

    new (codec: ScrcpyVideoCodecId): ScrcpyVideoDecoder;
}
