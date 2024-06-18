import type { FrameRenderer } from "./type.js";

export class BitmapFrameRenderer implements FrameRenderer {
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
