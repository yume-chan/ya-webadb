import type { MaybePromiseLike } from "@yume-chan/async";
import type { Event } from "@yume-chan/event";
import type {
    ScrcpyVideoCodecId,
    ScrcpyVideoSize,
    ScrcpyVideoStreamPacket,
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
    readonly type: ScrcpyVideoDecoder.Type;
    readonly onTypeChange?: Event<ScrcpyVideoDecoder.Type> | undefined;

    readonly rendererType: ScrcpyVideoDecoder.RendererType;
    readonly onRendererTypeChange?:
        | Event<ScrcpyVideoDecoder.RendererType>
        | undefined;

    readonly writable: WritableStream<ScrcpyVideoStreamPacket>;

    dispose?(): MaybePromiseLike<undefined>;
}

export namespace ScrcpyVideoDecoder {
    export type Type = "software" | "hardware";

    export type RendererType = "software" | "hardware";
}

export interface ScrcpyVideoDecoderConstructor {
    readonly capabilities: Record<string, ScrcpyVideoDecoderCapability>;

    new (codec: ScrcpyVideoCodecId): ScrcpyVideoDecoder;
}
