import { CanvasVideoFrameRenderer } from "./canvas.js";

export class BitmapVideoFrameRenderer extends CanvasVideoFrameRenderer {
    #context: ImageBitmapRenderingContext;

    constructor(
        canvas?: HTMLCanvasElement | OffscreenCanvas,
        options?: CanvasVideoFrameRenderer.Options,
    ) {
        super(canvas, options);

        this.#context = this.canvas.getContext("bitmaprenderer", {
            // Avoid alpha:false, which can be expensive
            // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#avoid_alphafalse_which_can_be_expensive
            alpha: true,
        })!;
    }

    async draw(frame: VideoFrame): Promise<void> {
        const bitmap = await createImageBitmap(frame);
        this.#context.transferFromImageBitmap(bitmap);
        bitmap.close();
    }
}
