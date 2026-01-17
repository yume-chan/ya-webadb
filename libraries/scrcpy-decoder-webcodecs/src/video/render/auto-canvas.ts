import { BitmapVideoFrameRenderer } from "./bitmap.js";
import type { CanvasVideoFrameRenderer } from "./canvas.js";
import type { VideoFrameRenderer } from "./type.js";
import { WebGLVideoFrameRenderer } from "./webgl.js";

export class AutoCanvasRenderer implements VideoFrameRenderer {
    #inner: CanvasVideoFrameRenderer;

    #type: "bitmap" | "webgl";
    get type() {
        return this.#type;
    }

    get canvas() {
        return this.#inner.canvas;
    }

    get writable() {
        return this.#inner.writable;
    }

    constructor(
        canvas?: HTMLCanvasElement | OffscreenCanvas,
        options?: WebGLVideoFrameRenderer.Options,
    ) {
        if (WebGLVideoFrameRenderer.isSupported) {
            this.#inner = new WebGLVideoFrameRenderer(canvas, options);
            this.#type = "webgl";
        } else {
            this.#inner = new BitmapVideoFrameRenderer(canvas, options);
            this.#type = "bitmap";
        }
    }

    snapshot(options?: ImageEncodeOptions): Promise<Blob | undefined> {
        return this.#inner.snapshot(options);
    }

    dispose() {
        return this.#inner.dispose();
    }
}
