import type { Disposable } from "@yume-chan/event";
import type {
    ScrcpyMediaStreamPacket,
    ScrcpyVideoCodecId,
    ScrcpyVideoSize,
} from "@yume-chan/scrcpy";
import type { WritableStream } from "@yume-chan/stream-extra";

export interface ScrcpyVideoDecoderCapability {
    maxProfile?: number;
    maxLevel?: number;
}

export interface ScrcpyVideoDecoderPerformanceCounter {
    /**
     * Gets the number of frames that have been drawn on the renderer
     */
    readonly framesDrawn: number;
    /**
     * Gets the number of frames that's visible to the user
     *
     * Might be `0` if the renderer is in a nested Web Worker on Chrome due to a Chrome bug.
     * https://issues.chromium.org/issues/41483010
     */
    readonly framesPresented: number;
    /**
     * Gets the number of frames that wasn't drawn on the renderer
     * because the renderer can't keep up
     */
    readonly framesSkipped: number;
}

export interface ScrcpyVideoDecoderPauseController {
    readonly paused: boolean;

    pause(): void;
    resume(): Promise<undefined>;
}

export interface ScrcpyVideoDecoder
    extends ScrcpyVideoDecoderPerformanceCounter,
        ScrcpyVideoDecoderPauseController,
        ScrcpyVideoSize,
        Disposable {
    readonly writable: WritableStream<ScrcpyMediaStreamPacket>;
}

export interface ScrcpyVideoDecoderConstructor {
    readonly capabilities: Record<string, ScrcpyVideoDecoderCapability>;

    new (codec: ScrcpyVideoCodecId): ScrcpyVideoDecoder;
}
