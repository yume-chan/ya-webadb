import { StickyEventEmitter } from "@yume-chan/event";
import type { ScrcpyVideoDecoder } from "@yume-chan/scrcpy-decoder-shared";
import { createCanvas } from "@yume-chan/scrcpy-decoder-shared";
import { WritableStream } from "@yume-chan/stream-extra";

import { BitmapVideoFrameRenderer } from "./bitmap.js";
import type { CanvasVideoFrameRenderer } from "./canvas.js";
import type { VideoFrameRenderer } from "./type.js";
import { WebGLVideoFrameRenderer } from "./webgl.js";

export class AutoCanvasRenderer implements VideoFrameRenderer {
    #inner!: CanvasVideoFrameRenderer;
    #innerWriter!: WritableStreamDefaultWriter<VideoFrame>;

    get type() {
        return this.#inner.type;
    }
    #onTypeChanged = new StickyEventEmitter<ScrcpyVideoDecoder.RendererType>();
    get onTypeChanged() {
        return this.#onTypeChanged.event;
    }

    #canvas!: HTMLCanvasElement | OffscreenCanvas;
    /**
     * Gets the canvas used by the renderer.
     *
     * The `canvas` property might change when the renderer switches between WebGL and 2D rendering.
     * Specify a `createCanvas` option, or listen to the `onTypeChanged` event to handle the canvas change.
     */
    get canvas() {
        return this.#canvas;
    }

    #lastFrame: VideoFrame | undefined;
    #writableController!: WritableStreamDefaultController;
    #writable = new WritableStream<VideoFrame>({
        start: (controller) => {
            this.#writableController = controller;
        },
        write: async (frame) => {
            this.#lastFrame?.close();
            this.#lastFrame = frame.clone();

            await this.#innerWriter.write(frame);
        },
    });
    get writable() {
        return this.#writable;
    }

    constructor(options?: AutoCanvasRenderer.Options) {
        this.#createInner(options, WebGLVideoFrameRenderer.isSupported);
    }

    #createInner(
        options: AutoCanvasRenderer.Options | undefined,
        webgl: boolean,
    ) {
        this.#canvas = options?.createCanvas?.() ?? createCanvas();
        if (webgl) {
            const webgl = new WebGLVideoFrameRenderer({
                ...options,
                canvas: this.#canvas,
            });
            webgl.onContextLost(() => {
                this.#createInner(options, false);
                if (this.#lastFrame) {
                    this.#innerWriter
                        .write(this.#lastFrame.clone())
                        .catch((e) => this.#writableController.error(e));
                }
            });
            this.#inner = webgl;
        } else {
            this.#inner = new BitmapVideoFrameRenderer({
                ...options,
                canvas: this.#canvas,
            });
        }
        this.#innerWriter = this.#inner.writable.getWriter();
        this.#onTypeChanged.fire(this.#inner.type);
    }

    snapshot(options?: ImageEncodeOptions): Promise<Blob | undefined> {
        return this.#inner.snapshot(options);
    }

    dispose() {
        this.#onTypeChanged.dispose();

        this.#lastFrame?.close();
        this.#lastFrame = undefined;

        return this.#inner.dispose();
    }
}

export namespace AutoCanvasRenderer {
    export interface Options extends Omit<
        WebGLVideoFrameRenderer.Options,
        "canvas"
    > {
        createCanvas?: () => HTMLCanvasElement | OffscreenCanvas;
    }
}
