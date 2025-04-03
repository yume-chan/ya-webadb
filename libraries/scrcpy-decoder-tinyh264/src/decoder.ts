import { PromiseResolver } from "@yume-chan/async";
import { StickyEventEmitter } from "@yume-chan/event";
import type { ScrcpyMediaStreamPacket } from "@yume-chan/scrcpy";
import {
    AndroidAvcLevel,
    AndroidAvcProfile,
    h264ParseConfiguration,
} from "@yume-chan/scrcpy";
import { WritableStream } from "@yume-chan/stream-extra";
import YuvBuffer from "yuv-buffer";
import YuvCanvas from "yuv-canvas";

import type {
    ScrcpyVideoDecoder,
    ScrcpyVideoDecoderCapability,
} from "./types.js";
import type { TinyH264Wrapper } from "./wrapper.js";
import { createTinyH264Wrapper } from "./wrapper.js";

const noop = () => {
    // no-op
};

export function createCanvas() {
    if (typeof document !== "undefined") {
        return document.createElement("canvas");
    }
    if (typeof OffscreenCanvas !== "undefined") {
        return new OffscreenCanvas(1, 1);
    }
    throw new Error("no canvas input found nor any canvas can be created");
}

export class TinyH264Decoder implements ScrcpyVideoDecoder {
    static readonly capabilities: Record<string, ScrcpyVideoDecoderCapability> =
        {
            h264: {
                maxProfile: AndroidAvcProfile.Baseline,
                maxLevel: AndroidAvcLevel.Level4,
            },
        };

    #renderer: HTMLCanvasElement | OffscreenCanvas;
    get renderer() {
        return this.#renderer;
    }

    #sizeChanged = new StickyEventEmitter<{ width: number; height: number }>();
    get sizeChanged() {
        return this.#sizeChanged.event;
    }

    #width: number = 0;
    get width() {
        return this.#width;
    }

    #height: number = 0;
    get height() {
        return this.#height;
    }

    #frameRendered = 0;
    get framesRendered() {
        return this.#frameRendered;
    }

    #frameSkipped = 0;
    get framesSkipped() {
        return this.#frameSkipped;
    }

    #writable: WritableStream<ScrcpyMediaStreamPacket>;
    get writable() {
        return this.#writable;
    }

    #yuvCanvas: YuvCanvas | undefined;
    #initializer: PromiseResolver<TinyH264Wrapper> | undefined;

    constructor({ canvas }: TinyH264Decoder.Options = {}) {
        if (canvas) {
            this.#renderer = canvas;
        } else {
            this.#renderer = createCanvas();
        }

        this.#writable = new WritableStream<ScrcpyMediaStreamPacket>({
            write: async (packet) => {
                switch (packet.type) {
                    case "configuration":
                        await this.#configure(packet.data);
                        break;
                    case "data": {
                        if (!this.#initializer) {
                            throw new Error("Decoder not configured");
                        }

                        const wrapper = await this.#initializer.promise;
                        wrapper.feed(packet.data.slice().buffer);
                        break;
                    }
                }
            },
        });
    }

    async #configure(data: Uint8Array) {
        this.dispose();

        this.#initializer = new PromiseResolver<TinyH264Wrapper>();
        if (!this.#yuvCanvas) {
            // yuv-canvas detects WebGL support by creating a <canvas> itself
            // not working in worker
            const canvas = createCanvas();
            const attributes: WebGLContextAttributes = {
                // Disallow software rendering.
                // Other rendering methods are faster than software-based WebGL.
                failIfMajorPerformanceCaveat: true,
            };
            const gl =
                canvas.getContext("webgl2", attributes) ||
                canvas.getContext("webgl", attributes);
            this.#yuvCanvas = YuvCanvas.attach(this.#renderer, {
                webGL: !!gl,
            });
        }

        const {
            encodedWidth,
            encodedHeight,
            croppedWidth,
            croppedHeight,
            cropLeft,
            cropTop,
        } = h264ParseConfiguration(data);

        this.#width = croppedWidth;
        this.#height = croppedHeight;
        this.#sizeChanged.fire({
            width: croppedWidth,
            height: croppedHeight,
        });

        // H.264 Baseline profile only supports YUV 420 pixel format
        // So chroma width/height is each half of video width/height
        const chromaWidth = encodedWidth / 2;
        const chromaHeight = encodedHeight / 2;

        // YUVCanvas will set canvas size when format changes
        const format = YuvBuffer.format({
            width: encodedWidth,
            height: encodedHeight,
            chromaWidth,
            chromaHeight,
            cropLeft: cropLeft,
            cropTop: cropTop,
            cropWidth: croppedWidth,
            cropHeight: croppedHeight,
            displayWidth: croppedWidth,
            displayHeight: croppedHeight,
        });

        const wrapper = await createTinyH264Wrapper();
        this.#initializer.resolve(wrapper);

        const uPlaneOffset = encodedWidth * encodedHeight;
        const vPlaneOffset = uPlaneOffset + chromaWidth * chromaHeight;
        wrapper.onPictureReady(({ data }) => {
            this.#frameRendered += 1;
            const array = new Uint8Array(data);
            const frame = YuvBuffer.frame(
                format,
                YuvBuffer.lumaPlane(format, array, encodedWidth, 0),
                YuvBuffer.chromaPlane(format, array, chromaWidth, uPlaneOffset),
                YuvBuffer.chromaPlane(format, array, chromaWidth, vPlaneOffset),
            );
            this.#yuvCanvas!.drawFrame(frame);
        });

        wrapper.feed(data.slice().buffer);
    }

    dispose(): void {
        this.#initializer?.promise
            .then((wrapper) => wrapper.dispose())
            // NOOP: It's disposed so nobody cares about the error
            .catch(noop);
        this.#initializer = undefined;
    }
}

export namespace TinyH264Decoder {
    export interface Options {
        /**
         * Optional render target canvas element or offscreen canvas.
         * If not provided, a new `<canvas>` (when DOM is available)
         * or a `OffscreenCanvas` will be created.
         */
        canvas?: HTMLCanvasElement | OffscreenCanvas | undefined;
    }
}
