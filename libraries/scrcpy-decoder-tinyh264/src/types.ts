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

    /**
     * Pause the decoder.
     *
     * It has a higher priority than {@link trackDocumentVisibility}.
     * After calling `pause`, the decoder can only be resumed by calling {@link resume}.
     */
    pause(): void;

    /**
     * Resume the decoder if it was paused.
     */
    resume(): Promise<undefined>;

    /**
     * Pause the decoder when the document becomes invisible,
     * and resume when the document becomes visible,
     * to save system resources and battery.
     *
     * @param document A document to track
     * @returns A function to stop tracking, and resume the decoder (if it was not explicitly paused)
     */
    trackDocumentVisibility(document: Document): () => undefined;
}

export interface ScrcpyVideoDecoder
    extends
        ScrcpyVideoDecoderPerformanceCounter,
        ScrcpyVideoDecoderPauseController,
        ScrcpyVideoSize,
        Disposable {
    readonly writable: WritableStream<ScrcpyMediaStreamPacket>;
}

export interface ScrcpyVideoDecoderConstructor {
    readonly capabilities: Record<string, ScrcpyVideoDecoderCapability>;

    new (codec: ScrcpyVideoCodecId): ScrcpyVideoDecoder;
}
