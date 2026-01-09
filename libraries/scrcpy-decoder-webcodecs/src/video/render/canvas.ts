import { createCanvas } from "@yume-chan/scrcpy-decoder-tinyh264";
import { WritableStream } from "@yume-chan/stream-extra";

import type { VideoFrameRenderer } from "./type.js";

export abstract class CanvasVideoFrameRenderer implements VideoFrameRenderer {
    #canvas: HTMLCanvasElement | OffscreenCanvas;
    get canvas() {
        return this.#canvas;
    }

    #options: CanvasVideoFrameRenderer.Options | undefined;

    #resizeObserver: ResizeObserver | undefined;

    // Save the frame for redraw on resize
    #frame: VideoFrame | undefined;

    #writable = new WritableStream<VideoFrame>({
        write: async (frame) => {
            this.#frame?.close();
            this.#frame = frame;

            if (!this.#options?.useDevicePixels) {
                this.#updateSize(frame.codedWidth, frame.codedHeight);
            }

            await this.draw(frame);
            // Don't close `frame`, which is required when resizing
            // `frame` will be closed when next frame arrives or the stream ends
        },
        close: () => this.dispose(),
        abort: () => this.dispose(),
    });
    get writable() {
        return this.#writable;
    }

    constructor(
        canvas?: HTMLCanvasElement | OffscreenCanvas,
        options?: CanvasVideoFrameRenderer.Options,
    ) {
        if (canvas) {
            this.#canvas = canvas;
        } else {
            this.#canvas = createCanvas();
        }

        this.#options = options;

        if (options?.useDevicePixels) {
            if (!(canvas instanceof HTMLCanvasElement)) {
                throw new Error(
                    "useDevicePixels is only supported for HTMLCanvasElement",
                );
            }

            this.#resizeObserver = new ResizeObserver((entries) => {
                const entry = entries[0]!;

                let width: number;
                let height: number;
                if (entry.devicePixelContentBoxSize) {
                    const size = entry.devicePixelContentBoxSize[0]!;
                    width = size.inlineSize;
                    height = size.blockSize;
                } else {
                    const size = entry.contentBoxSize[0]!;
                    width = Math.round(size.inlineSize * devicePixelRatio);
                    height = Math.round(size.blockSize * devicePixelRatio);
                }

                if (this.#updateSize(width, height) && this.#frame) {
                    void this.draw(this.#frame);
                }
            });
            this.#resizeObserver.observe(canvas);
        }
    }

    #updateSize(width: number, height: number) {
        if (this.#frame) {
            width = Math.min(width, this.#frame.codedWidth);
            height = Math.min(height, this.#frame.codedHeight);
        }

        if (this.#canvas.width === width && this.#canvas.height === height) {
            return false;
        }

        this.#canvas.width = width;
        this.#canvas.height = height;
        return true;
    }

    /**
     * Draws the frame on `<canvas>`.
     *
     * Derived classes must not transfer or close the `frame`.
     */
    abstract draw(frame: VideoFrame): Promise<void>;

    dispose(): undefined {
        this.#canvas.width = 0;
        this.#canvas.height = 0;

        this.#resizeObserver?.disconnect();
        this.#frame?.close();
    }
}

export namespace CanvasVideoFrameRenderer {
    export interface Options {
        /**
         * Whether to link the rendering resolution to `<canvas>`'s display size.
         *
         * If the display size is smaller than video resolution,
         * this will improve the rendering performance.
         * Rendering resolution won't exceed the video resolution.
         *
         * Use `style.width/height` to set the display size
         * (can be in any units such as `px`, `%`, `em`, etc.).
         * The size must have correct aspect ratio.
         *
         * Only apply to HTMLCanvasElement
         */
        useDevicePixels?: boolean;
    }
}
