import {
    AndroidAvcLevel,
    AndroidAvcProfile,
    ScrcpyVideoSizeImpl,
} from "@yume-chan/scrcpy";
import type {
    ScrcpyVideoDecoder,
    ScrcpyVideoDecoderCapability,
} from "@yume-chan/scrcpy-decoder-shared";
import {
    createCanvas,
    glIsSupported,
    ScrcpyVideoDecoderPauseController,
    ScrcpyVideoDecoderPerformanceCounter,
    ScrcpyVideoRendererPerformanceCounter,
} from "@yume-chan/scrcpy-decoder-shared";
import type { WritableStreamDefaultController } from "@yume-chan/stream-extra";
import { WritableStream } from "@yume-chan/stream-extra";
import * as Comlink from "comlink";

import { DecoderRenderer } from "./decoder-renderer.js";

export const noop = () => {
    // no-op
};

const isMainThread = typeof window !== "undefined";

export class H264BsdDecoder implements ScrcpyVideoDecoder {
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

    #rendererType: "software" | "hardware";
    get rendererType() {
        return this.#rendererType;
    }

    #pause = new ScrcpyVideoDecoderPauseController();
    get paused() {
        return this.#pause.paused;
    }
    get writable() {
        return this.#pause.writable;
    }

    #writableController!: WritableStreamDefaultController;
    #queue: (ScrcpyVideoDecoderPauseController.Output & { type: "data" })[] =
        [];
    #enqueuing = false;

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

    #decoderCounter = new ScrcpyVideoDecoderPerformanceCounter();
    /**
     * Gets the number of times the decoder has been reset to catch up new keyframes.
     */
    get decoderResetCount() {
        return this.#decoderCounter.decoderResetCount;
    }
    /**
     * Gets the number of frames decoded by the decoder.
     */
    get framesDecoded() {
        return this.#decoderCounter.framesDecoded;
    }
    /**
     * Gets the number of frames skipped by the decoder.
     */
    get framesSkippedDecoding() {
        return this.#decoderCounter.framesSkippedDecoding;
    }
    #rendererCounter = new ScrcpyVideoRendererPerformanceCounter();
    /**
     * Gets the number of frames that have been drawn on the renderer.
     */
    get framesRendered() {
        return this.#rendererCounter.framesRendered;
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
        return this.#rendererCounter.framesDisplayed;
    }
    /**
     * Gets the number of frames that wasn't drawn on the renderer
     * because the renderer can't keep up
     */
    get framesSkippedRendering() {
        return this.#rendererCounter.framesSkippedRendering;
    }

    #worker: Worker | undefined;
    #decoder: DecoderRenderer | Promise<Comlink.Remote<DecoderRenderer>>;

    constructor({ canvas, worker }: H264BsdDecoder.Options = {}) {
        switch (worker) {
            case "auto":
            case undefined:
                worker = isMainThread;
                break;
            case true:
                if (!isMainThread && !canvas) {
                    throw new Error(
                        "`canvas` is required when `worker` is `true` and running in Web Worker",
                    );
                }
                break;
        }

        if (canvas) {
            this.#canvas = canvas;
        } else {
            this.#canvas = createCanvas();
        }

        // Disallow software rendering.
        // yuv-canvas also supports 2d canvas
        // which is faster than software-based WebGL.
        const webGl = glIsSupported({ failIfMajorPerformanceCaveat: true });
        this.#rendererType = webGl ? "hardware" : "software";

        if (worker) {
            this.#worker = new Worker(
                new URL("./wrapper.js", import.meta.url),
                {
                    type: "module",
                },
            );
            const RemoteDecoderRenderer = Comlink.wrap<typeof DecoderRenderer>(
                this.#worker,
            );

            canvas = this.#canvas;
            if (isMainThread && canvas instanceof HTMLCanvasElement) {
                canvas = canvas.transferControlToOffscreen();
            }

            this.#decoder = new RemoteDecoderRenderer(
                Comlink.transfer(canvas, [canvas]),
                webGl,
                Comlink.proxy(this.#handleSizeChange),
            );
        } else {
            this.#decoder = new DecoderRenderer(
                this.#canvas,
                webGl,
                this.#handleSizeChange,
            );
        }

        void this.#pause.readable
            .pipeTo(
                new WritableStream({
                    start: (controller) => {
                        this.#writableController = controller;
                    },
                    write: async (packet) => {
                        if (packet.type === "configuration") {
                            this.#decoderCounter.addFramesSkippedDecoding(
                                this.#queue.length,
                            );
                            this.#queue.length = 0;

                            const decoder = await this.#decoder;

                            const frames = await decoder.flush(true);
                            this.#rendererCounter.addFramesSkippedRendering(
                                frames,
                            );

                            // Shouldn't produce any frames
                            await decoder.decode(packet.data, false);
                            return;
                        }

                        if (packet.keyframe && this.#queue.length) {
                            this.#decoderCounter.addFramesSkippedDecoding(
                                this.#queue.length,
                            );
                            this.#decoderCounter.increaseResetCount();
                            this.#queue.length = 0;
                        }

                        this.#queue.push(packet);
                        void this.#decode();
                    },
                }),
            )
            .catch(noop);
    }

    #handleSizeChange = ({
        width,
        height,
    }: {
        width: number;
        height: number;
    }) => {
        this.#size.setSize(width, height);
    };

    async #decode() {
        if (this.#enqueuing) {
            return;
        }
        this.#enqueuing = true;

        try {
            const decoder = await this.#decoder;

            let chunk:
                | (ScrcpyVideoDecoderPauseController.Output & { type: "data" })
                | undefined;
            while ((chunk = this.#queue.shift())) {
                const framesDecoded = await decoder.decode(
                    chunk.data,
                    chunk.skipRendering,
                );
                if (framesDecoded) {
                    this.#decoderCounter.addFramesDecoded(framesDecoded);
                    this.#rendererCounter.addFramesSkippedRendering(
                        framesDecoded - 1,
                    );
                }
            }
        } catch (e) {
            this.#writableController.error(e);
        } finally {
            this.#enqueuing = false;
        }
    }

    pause(): void {
        this.#pause.pause();
    }

    resume(): undefined {
        this.#pause.resume();
    }

    trackDocumentVisibility(document: Document): () => undefined {
        return this.#pause.trackDocumentVisibility(document);
    }

    async dispose(): Promise<undefined> {
        // This class doesn't need to guard against multiple dispose calls
        // since most of the logic is already handled in `#pause`
        this.#pause.dispose();

        const decoder = await this.#decoder;
        await decoder.flush(false);
        await decoder?.dispose();

        this.#worker?.terminate();

        this.#rendererCounter.dispose();
        this.#size.dispose();

        this.#canvas.width = 0;
        this.#canvas.height = 0;
    }
}

export namespace H264BsdDecoder {
    export interface Options {
        /**
         * Optional render target canvas element or offscreen canvas.
         * If not provided, a new `<canvas>` (when DOM is available)
         * or a `OffscreenCanvas` will be created.
         */
        canvas?: HTMLCanvasElement | OffscreenCanvas | undefined;

        /**
         * Whether to create a Web Worker to run the decoder.
         *
         * Value can be:
         *
         *   * `"auto"`: Create a Web Worker if currently running in main thread
         *   * `true`: Always create a Web Worker.
         *      Note that if it's currently already running in a Web Worker,
         *      The `canvas` option must be provided with an `OffscreenCanvas`,
         *      and the `OffscreenCanvas` will be transferred to the new Worker.
         *   * `false`: Never create a Web Worker
         *
         * The default value is `"auto"`.
         */
        worker?: "auto" | boolean;
    }
}
