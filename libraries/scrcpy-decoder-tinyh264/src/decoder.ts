import { PromiseResolver } from "@yume-chan/async";
import type {
    ScrcpyMediaStreamConfigurationPacket,
    ScrcpyMediaStreamPacket,
} from "@yume-chan/scrcpy";
import {
    AndroidAvcLevel,
    AndroidAvcProfile,
    h264ParseConfiguration,
    ScrcpyVideoSizeImpl,
} from "@yume-chan/scrcpy";
import { WritableStream } from "@yume-chan/stream-extra";
import YuvBuffer from "yuv-buffer";
import YuvCanvas from "yuv-canvas";

import type {
    ScrcpyVideoDecoder,
    ScrcpyVideoDecoderCapability,
} from "./types.js";
import { PauseControllerImpl } from "./utils/pause.js";
import { PerformanceCounterImpl } from "./utils/performance.js";
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

export function webGLGetContext(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    attributes?: WebGLContextAttributes,
): WebGLRenderingContext | WebGL2RenderingContext | null {
    // For unknown reason, TypeScript can't correctly infer return type of
    // `(HTMLCanvasElement | OffscreenCanvas).getContext("webgl2")`.
    // so this helper function

    {
        const context = canvas.getContext(
            "webgl2",
            attributes,
        ) as WebGL2RenderingContext | null;

        if (context) {
            return context;
        }
    }

    {
        const context = canvas.getContext(
            "webgl",
            attributes,
        ) as WebGLRenderingContext | null;

        if (context) {
            return context;
        }
    }

    return null;
}

export function webGLLoseContext(context: WebGLRenderingContext) {
    try {
        context.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
        // ignore
    }
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

    #size = new ScrcpyVideoSizeImpl();
    get width() {
        return this.#size.width;
    }
    get height() {
        return this.#size.height;
    }
    get sizeChanged() {
        return this.#size.sizeChanged;
    }

    #counter = new PerformanceCounterImpl();
    get framesRendered() {
        return this.#counter.framesRendered;
    }
    get framesSkipped() {
        return this.#counter.framesSkipped;
    }

    #pause: PauseControllerImpl;
    get paused() {
        return this.#pause.paused;
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

        this.#pause = new PauseControllerImpl(
            this.#configure,
            async (packet) => {
                if (!this.#initializer) {
                    throw new Error("Decoder not configured");
                }

                // TinyH264 decoder doesn't support associating metadata
                // with each frame's input/output
                // so skipping frames when resuming from pause is not supported

                const wrapper = await this.#initializer.promise;

                // `packet.data` might be from a `BufferCombiner` so we have to copy it using `slice`
                wrapper.feed(packet.data.slice().buffer);
            },
        );

        this.#writable = new WritableStream<ScrcpyMediaStreamPacket>({
            write: this.#pause.write,
        });
    }

    #configure = async ({
        data,
    }: ScrcpyMediaStreamConfigurationPacket): Promise<undefined> => {
        this.#disposeDecoder();

        this.#initializer = new PromiseResolver<TinyH264Wrapper>();
        if (!this.#yuvCanvas) {
            // yuv-canvas supports detecting WebGL support by creating a <canvas> itself
            // But this doesn't work in Web Worker (with OffscreenCanvas)
            // so we implement our own check here
            const canvas = createCanvas();
            const gl = webGLGetContext(canvas, {
                // Disallow software rendering.
                // yuv-canvas also supports 2d canvas
                // which is faster than software-based WebGL.
                failIfMajorPerformanceCaveat: true,
            });
            if (gl) {
                webGLLoseContext(gl);
            }
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

        this.#size.setSize(croppedWidth, croppedHeight);

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
            const array = new Uint8Array(data);
            const frame = YuvBuffer.frame(
                format,
                YuvBuffer.lumaPlane(format, array, encodedWidth, 0),
                YuvBuffer.chromaPlane(format, array, chromaWidth, uPlaneOffset),
                YuvBuffer.chromaPlane(format, array, chromaWidth, vPlaneOffset),
            );
            this.#yuvCanvas!.drawFrame(frame);
            this.#counter.increaseFramesDrawn();
        });

        wrapper.feed(data.slice().buffer);
    };

    pause(): void {
        this.#pause.pause();
    }

    resume(): Promise<undefined> {
        return this.#pause.resume();
    }

    /**
     * Only dispose the TinyH264 decoder instance.
     *
     * This will be called when re-configuring multiple times,
     * we don't want to dispose other parts (e.g. `#counter`) on that case
     */
    #disposeDecoder() {
        this.#initializer?.promise
            .then((wrapper) => wrapper.dispose())
            // NOOP: It's disposed so nobody cares about the error
            .catch(noop);
        this.#initializer = undefined;
    }

    dispose(): void {
        this.#counter.dispose();
        this.#disposeDecoder();
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
