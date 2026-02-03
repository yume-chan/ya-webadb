import type { MaybePromiseLike } from "@yume-chan/async";
import { createCanvas } from "@yume-chan/scrcpy-decoder-tinyh264";
import { WritableStream } from "@yume-chan/stream-extra";

import { canvasToBlob } from "../utils/index.js";

import { RedrawController } from "./redraw.js";
import type { VideoFrameRenderer } from "./type.js";

export abstract class CanvasVideoFrameRenderer<
    TOptions extends CanvasVideoFrameRenderer.Options =
        CanvasVideoFrameRenderer.Options,
> implements VideoFrameRenderer {
    abstract get type(): "software" | "hardware";

    #canvas: HTMLCanvasElement | OffscreenCanvas;
    get canvas() {
        return this.#canvas;
    }

    #options: TOptions | undefined;
    #canvasSize: CanvasVideoFrameRenderer.Options["canvasSize"];
    get options(): Readonly<TOptions> | undefined {
        return this.#options;
    }

    #resizeObserver: ResizeObserver | undefined;
    #displayWidth = Infinity;
    #displayHeight = Infinity;

    #draw: (frame: VideoFrame) => MaybePromiseLike<undefined>;
    #controller = new RedrawController((frame) => {
        if (this.#canvasSize !== "external") {
            this.#updateSize(frame);
        }

        return this.#draw(frame);
    });
    get lastFrame() {
        return this.#controller.lastFrame;
    }

    #writable = new WritableStream<VideoFrame>({
        write: (frame) => this.#controller.draw(frame),
    });
    get writable() {
        return this.#writable;
    }

    constructor(
        draw: (frame: VideoFrame) => MaybePromiseLike<undefined>,
        options?: TOptions,
    ) {
        this.#draw = draw;
        this.#canvas = options?.canvas ?? createCanvas();
        this.#options = options;
        this.#canvasSize = options?.canvasSize ?? "video";

        if (this.#canvasSize === "display") {
            if (
                typeof HTMLCanvasElement === "undefined" ||
                !(this.#canvas instanceof HTMLCanvasElement)
            ) {
                throw new Error(
                    "`canvasSize: display` is only supported for HTMLCanvasElement",
                );
            }

            this.#resizeObserver = new ResizeObserver((entries) => {
                const entry = entries[0];
                if (!entry) {
                    return;
                }

                const devicePixelSize = entry.devicePixelContentBoxSize?.[0];
                if (devicePixelSize) {
                    this.#setDisplaySize(
                        devicePixelSize.inlineSize,
                        devicePixelSize.blockSize,
                    );
                    return;
                }

                const cssSize = entry.contentBoxSize[0];
                if (cssSize) {
                    this.#setDisplaySize(
                        Math.round(cssSize.inlineSize * devicePixelRatio),
                        Math.round(cssSize.blockSize * devicePixelRatio),
                    );
                }
            });
            this.#resizeObserver.observe(this.#canvas);
        }
    }

    #setDisplaySize(width: number, height: number) {
        if (this.#displayWidth === width && this.#displayHeight === height) {
            return;
        }

        this.#displayWidth = width;
        this.#displayHeight = height;

        void this.#controller.redraw();
    }

    #updateSize(frame: VideoFrame) {
        let { codedWidth: width, codedHeight: height } = frame;
        if (this.#canvasSize === "display") {
            width = Math.min(width, this.#displayWidth);
            height = Math.min(height, this.#displayHeight);
        }

        if (this.#canvas.width === width && this.#canvas.height === height) {
            return false;
        }

        this.#canvas.width = width;
        this.#canvas.height = height;
        return true;
    }

    /**
     * Redraws the last drawn frame.
     *
     * If a draw or redraw is in progress, it waits for them to finish before redrawing.
     *
     * If a redraw is in progress and another one is in queue,
     * it cancels the queued redraw and redraws the latest frame instead.
     */
    redraw() {
        return this.#controller.redraw();
    }

    async snapshot(options?: ImageEncodeOptions): Promise<Blob | undefined> {
        if (this.#canvasSize !== "video") {
            return undefined;
        }
        return canvasToBlob(this.#canvas, options);
    }

    dispose(): undefined {
        if (this.#canvasSize !== "external") {
            this.#canvas.width = 0;
            this.#canvas.height = 0;
        }

        this.#resizeObserver?.disconnect();
        this.#controller.dispose();
    }
}

export namespace CanvasVideoFrameRenderer {
    export interface Options {
        canvas?: HTMLCanvasElement | OffscreenCanvas;

        /**
         * Whether to update the canvas size (rendering resolution) automatically.
         *
         * * `"video"` (default): update the canvas size to match the video resolution
         * * `"display"` (only for `HTMLCanvasElement`):
         *    update the canvas size to match the display size.
         *    The display size can be set using `canvas.style.width/height`,
         *    and must be in correct aspect ratio.
         * * `"external"`: use the canvas size as it is.
         *    The size must be manually set using `canvas.width/height`,
         *    and must be in correct aspect ratio.
         */
        canvasSize?: "video" | "display" | "external";
    }
}
