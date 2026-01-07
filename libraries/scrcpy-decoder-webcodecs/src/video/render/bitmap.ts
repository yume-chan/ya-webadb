import { CanvasVideoFrameRenderer } from "./canvas.js";

export class BitmapVideoFrameRenderer extends CanvasVideoFrameRenderer {
    #context: ImageBitmapRenderingContext;

    // Can't find whether `ImageBitmapRenderingContext` allows `ImageBitmap`'s `width/height`
    // to be different from `canvas`'s `width/height`, so don't support `options`
    constructor(canvas?: HTMLCanvasElement | OffscreenCanvas) {
        super(canvas);

        this.#context = this.canvas.getContext("bitmaprenderer", {
            // Avoid alpha:false, which can be expensive
            // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#avoid_alphafalse_which_can_be_expensive
            alpha: true,
        })!;
    }

    async draw(frame: VideoFrame): Promise<void> {
        const bitmap = await createImageBitmap(frame);
        this.#context.transferFromImageBitmap(bitmap);
    }
}
