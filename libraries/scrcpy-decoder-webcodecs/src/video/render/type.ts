import type { MaybePromiseLike } from "@yume-chan/async";

export interface VideoFrameRenderer {
    setSize(width: number, height: number): void;

    draw(frame: VideoFrame): MaybePromiseLike<void>;
}
