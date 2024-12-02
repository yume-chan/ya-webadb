import { CanvasWebCodecsDecoderRenderer } from "./canvas.js";

export class BitmapWebCodecsDecoderRenderer extends CanvasWebCodecsDecoderRenderer {
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
