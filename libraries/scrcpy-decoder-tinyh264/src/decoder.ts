import { PromiseResolver } from "@yume-chan/async";
import { H264 } from "@yume-chan/media-codec";
import type { ScrcpyMediaStreamConfigurationPacket } from "@yume-chan/scrcpy";
import {
    AndroidAvcLevel,
    AndroidAvcProfile,
    ScrcpyVideoSizeImpl,
} from "@yume-chan/scrcpy";
import { WritableStream } from "@yume-chan/stream-extra";
import YuvBuffer from "yuv-buffer";
import YuvCanvas from "yuv-canvas";

import type {
    ScrcpyVideoDecoder,
    ScrcpyVideoDecoderCapability,
} from "./types.js";
import {
    createCanvas,
    glIsSupported,
    PauseController,
    PerformanceCounter,
} from "./utils/index.js";
import type { TinyH264Wrapper } from "./wrapper.js";
import { createTinyH264Wrapper } from "./wrapper.js";

export const noop = () => {
    // no-op
};

export class TinyH264Decoder implements ScrcpyVideoDecoder {
    static readonly capabilities: Record<string, ScrcpyVideoDecoderCapability> =
        {
            h264: {
                maxProfile: AndroidAvcProfile.Baseline,
                maxLevel: AndroidAvcLevel.Level4,
            },
        };

    get type() {
        return "software" as const;
    }

    #canvas: HTMLCanvasElement | OffscreenCanvas;
    get canvas() {
        return this.#canvas;
    }

    #renderer: YuvCanvas | undefined;
    #rendererType: "software" | "hardware";
    get rendererType() {
        return this.#rendererType;
    }

    #pause = new PauseController();
    get paused() {
        return this.#pause.paused;
    }

    get writable() {
        return this.#pause.writable;
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

    #counter = new PerformanceCounter();
    /**
     * Gets the number of frames that have been drawn on the renderer.
     */
    get framesRendered() {
        return this.#counter.framesRendered;
    }
    /**
     * Gets the number of frames that's visible to the user.
     *
     * Multiple frames might be rendered during one vertical sync interval,
     * but only the last of them is represented to the user.
     * This costs some performance but reduces latency by 1 frame.
     *
     * Might be `0` if the renderer is in a nested Web Worker on Chrome due to a Chrome bug.
     * https://issues.chromium.org/issues/41483010
     */
    get framesDisplayed() {
        return this.#counter.framesDisplayed;
    }
    /**
     * Gets the number of frames that wasn't drawn on the renderer
     * because the renderer can't keep up
     */
    get framesSkippedRendering() {
        return this.#counter.framesSkippedRendering;
    }

    #decoder: Promise<TinyH264Wrapper> | undefined;

    constructor({ canvas }: TinyH264Decoder.Options = {}) {
        if (canvas) {
            this.#canvas = canvas;
        } else {
            this.#canvas = createCanvas();
        }

        const webGlSupported = glIsSupported({
            // Disallow software rendering.
            // yuv-canvas also supports 2d canvas
            // which is faster than software-based WebGL.
            failIfMajorPerformanceCaveat: true,
        });
        this.#renderer = YuvCanvas.attach(this.#canvas, {
            // yuv-canvas supports detecting WebGL support by creating a <canvas> itself
            // But this doesn't work in Web Worker (with OffscreenCanvas)
            // so we implement our own check here
            webGL: webGlSupported,
        });
        this.#rendererType = webGlSupported ? "hardware" : "software";

        void this.#pause.readable
            .pipeTo(
                new WritableStream({
                    write: async (packet) => {
                        if (packet.type === "configuration") {
                            await this.#configure(packet);
                            return;
                        }

                        if (!this.#decoder) {
                            throw new Error("Decoder not configured");
                        }

                        // TinyH264 decoder doesn't support associating metadata
                        // with each frame's input/output
                        // so skipping frames when resuming from pause is not supported

                        const decoder = await this.#decoder;

                        // `packet.data` might be from a `BufferCombiner` so we have to copy it using `slice`
                        decoder.feed(packet.data.slice().buffer);
                    },
                }),
            )
            .catch(noop);
    }

    #configure = async ({
        data,
    }: ScrcpyMediaStreamConfigurationPacket): Promise<undefined> => {
        this.#disposeDecoder();

        const resolver = new PromiseResolver<TinyH264Wrapper>();
        this.#decoder = resolver.promise;

        try {
            const {
                encodedWidth,
                encodedHeight,
                croppedWidth,
                croppedHeight,
                cropLeft,
                cropTop,
            } = H264.parseConfiguration(data);

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

            const decoder = await createTinyH264Wrapper();

            const uPlaneOffset = encodedWidth * encodedHeight;
            const vPlaneOffset = uPlaneOffset + chromaWidth * chromaHeight;
            decoder.onPictureReady(({ data }) => {
                // TinyH264 doesn't pass any frame metadata to `onPictureReady`
                // so frames marked as skipped (by pause controller) can't be skipped

                const array = new Uint8Array(data);
                const frame = YuvBuffer.frame(
                    format,
                    YuvBuffer.lumaPlane(format, array, encodedWidth, 0),
                    YuvBuffer.chromaPlane(
                        format,
                        array,
                        chromaWidth,
                        uPlaneOffset,
                    ),
                    YuvBuffer.chromaPlane(
                        format,
                        array,
                        chromaWidth,
                        vPlaneOffset,
                    ),
                );

                // Can't know if yuv-canvas is dropping frames or not
                this.#renderer!.drawFrame(frame);
                this.#counter.increaseFramesRendered();
            });

            decoder.feed(data.slice().buffer);

            resolver.resolve(decoder);
        } catch (e) {
            resolver.reject(e);
        }
    };

    pause(): void {
        this.#pause.pause();
    }

    resume(): undefined {
        this.#pause.resume();
    }

    trackDocumentVisibility(document: Document): () => undefined {
        return this.#pause.trackDocumentVisibility(document);
    }

    /**
     * Only dispose the TinyH264 decoder instance.
     *
     * This will be called when re-configuring multiple times,
     * we don't want to dispose other parts (e.g. `#counter`) on that case
     */
    #disposeDecoder() {
        if (!this.#decoder) {
            return;
        }

        this.#decoder
            .then((decoder) => decoder.dispose())
            // NOOP: It's disposed so nobody cares about the error
            .catch(noop);
        this.#decoder = undefined;
    }

    dispose(): void {
        // This class doesn't need to guard against multiple dispose calls
        // since most of the logic is already handled in `#pause`
        this.#pause.dispose();

        this.#disposeDecoder();
        this.#counter.dispose();
        this.#size.dispose();

        this.#canvas.width = 0;
        this.#canvas.height = 0;
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
