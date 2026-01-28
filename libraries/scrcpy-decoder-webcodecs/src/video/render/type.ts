import type { MaybePromiseLike } from "@yume-chan/async";
import type { WritableStream } from "@yume-chan/stream-extra";

export interface VideoFrameRenderer {
    readonly type: "software" | "hardware";

    readonly writable: WritableStream<VideoFrame>;

    snapshot?(options?: ImageEncodeOptions): Promise<Blob | undefined>;

    dispose?(): MaybePromiseLike<undefined>;
}
