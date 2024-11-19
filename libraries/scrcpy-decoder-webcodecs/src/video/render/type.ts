import type { MaybePromiseLike } from "@yume-chan/async";

export interface WebCodecsVideoDecoderRenderer {
    setSize(width: number, height: number): void;

    draw(frame: VideoFrame): MaybePromiseLike<void>;
}
