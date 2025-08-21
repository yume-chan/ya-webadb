import type { Disposable, Event } from "@yume-chan/event";
import type {
    ScrcpyMediaStreamPacket,
    ScrcpyVideoCodecId,
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
        Disposable {
    readonly sizeChanged: Event<{ width: number; height: number }>;
    readonly width: number;
    readonly height: number;

    readonly writable: WritableStream<ScrcpyMediaStreamPacket>;
}

export interface ScrcpyVideoDecoderConstructor {
    readonly capabilities: Record<string, ScrcpyVideoDecoderCapability>;

    new (codec: ScrcpyVideoCodecId): ScrcpyVideoDecoder;
}
