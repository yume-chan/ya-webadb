import { CanvasVideoFrameRenderer } from "./canvas.js";

export class BitmapVideoFrameRenderer extends CanvasVideoFrameRenderer {
    override get type() {
        return "software" as const;
    }

    #context: ImageBitmapRenderingContext;

    constructor(options?: CanvasVideoFrameRenderer.Options) {
        super(async (frame) => {
            const bitmap = await createImageBitmap(frame);
            this.#context.transferFromImageBitmap(bitmap);
            bitmap.close();
        }, options);

        const context = (this.canvas as HTMLCanvasElement).getContext(
            "bitmaprenderer",
            {
                // Avoid alpha:false, which can be expensive
                // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#avoid_alphafalse_which_can_be_expensive
                alpha: true,
            },
        );
        if (!context) {
            // This can happen if the canvas already has a context of a different type
            throw new Error("Failed to create rendering context");
        }

        this.#context = context;
    }
}
