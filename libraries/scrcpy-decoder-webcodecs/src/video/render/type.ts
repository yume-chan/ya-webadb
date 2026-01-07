import type { WritableStream } from "@yume-chan/stream-extra";

export interface VideoFrameRenderer {
    writeable: WritableStream<VideoFrame>;
}
