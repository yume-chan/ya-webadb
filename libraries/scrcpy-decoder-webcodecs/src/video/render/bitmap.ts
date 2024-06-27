import type { FrameSink } from "./type.js";

export class BitmapFrameSink implements FrameSink {
    #context: ImageBitmapRenderingContext;

    constructor(canvas: HTMLCanvasElement | OffscreenCanvas) {
        this.#context = canvas.getContext("bitmaprenderer", { alpha: false })!;
    }

    draw(frame: VideoFrame): void {
        createImageBitmap(frame)
            .then((bitmap) => {
                this.#context.transferFromImageBitmap(bitmap);
                frame.close();
            })
            .catch((e) => {
                console.warn(
                    "[@yume-chan/scrcpy-decoder-webcodecs]",
                    "VideoDecoder error",
                    e,
                );
            });
    }
}
