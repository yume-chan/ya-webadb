import { CanvasVideoFrameRenderer } from "./canvas.js";

export class BitmapVideoFrameRenderer extends CanvasVideoFrameRenderer {
    #context: ImageBitmapRenderingContext;

    constructor(canvas?: HTMLCanvasElement | OffscreenCanvas) {
        super(canvas);

        this.#context = this.canvas.getContext("bitmaprenderer", {
            alpha: false,
        })!;
    }

    async draw(frame: VideoFrame): Promise<void> {
        const bitmap = await createImageBitmap(frame);
        this.#context.transferFromImageBitmap(bitmap);
    }
}
