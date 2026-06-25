import type { MaybePromiseLike } from "@yume-chan/async";
import type { Event } from "@yume-chan/event";
import type { ScrcpyVideoDecoder } from "@yume-chan/scrcpy-decoder-shared";
import type { WritableStream } from "@yume-chan/stream-extra";

export interface VideoFrameRenderer {
    readonly type: ScrcpyVideoDecoder.RendererType;
    readonly onTypeChanged?: Event<ScrcpyVideoDecoder.RendererType>;

    readonly writable: WritableStream<VideoFrame>;

    snapshot?(options?: ImageEncodeOptions): Promise<Blob | undefined>;

    dispose?(): MaybePromiseLike<undefined>;
}
