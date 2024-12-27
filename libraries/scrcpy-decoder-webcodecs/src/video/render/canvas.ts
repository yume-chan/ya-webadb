import { createCanvas } from "@yume-chan/scrcpy-decoder-tinyh264";

import type { VideoFrameRenderer } from "./type.js";

export abstract class CanvasVideoFrameRenderer implements VideoFrameRenderer {
    #canvas: HTMLCanvasElement | OffscreenCanvas;
    get canvas() {
        return this.#canvas;
    }

    constructor(canvas?: HTMLCanvasElement | OffscreenCanvas) {
        if (canvas) {
            this.#canvas = canvas;
        } else {
            this.#canvas = createCanvas();
        }
    }

    setSize(width: number, height: number): void {
        if (this.#canvas.width !== width || this.#canvas.height !== height) {
            this.#canvas.width = width;
            this.#canvas.height = height;
        }
    }

    abstract draw(frame: VideoFrame): Promise<void>;
}
