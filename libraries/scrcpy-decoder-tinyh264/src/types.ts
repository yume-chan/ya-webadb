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
    readonly framesRendered: number;
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
