import { ScrcpyVideoCodecId, ScrcpyVideoSizeImpl } from "@yume-chan/scrcpy";
import type {
    ScrcpyVideoDecoder,
    ScrcpyVideoDecoderCapability,
} from "@yume-chan/scrcpy-decoder-tinyh264";
import { noop, PauseController } from "@yume-chan/scrcpy-decoder-tinyh264";
import { InspectStream } from "@yume-chan/stream-extra";

import {
    Av1TransformStream,
    H264TransformStream,
    H265TransformStream,
} from "./codec/index.js";
import type { CodecTransformStream } from "./codec/type.js";
import type { VideoFrameRenderer } from "./render/index.js";
import {
    AutoCanvasRenderer,
    BitmapVideoFrameRenderer,
    RendererController,
} from "./render/index.js";
import { TimestampTransforms, VideoDecoderStream } from "./utils/index.js";

export class WebCodecsVideoDecoder implements ScrcpyVideoDecoder {
    static get isSupported() {
        return typeof globalThis.VideoDecoder !== "undefined";
    }

    static readonly capabilities: Record<string, ScrcpyVideoDecoderCapability> =
        {
            h264: {},
            h265: {},
            av1: {},
        };

    // #region parameters

    #type: "software" | "hardware";
    get type() {
        return this.#type;
    }

    #codec: ScrcpyVideoCodecId;
    get codec() {
        return this.#codec;
    }

    #renderer: VideoFrameRenderer;
    get renderer() {
        return this.#renderer;
    }

    get rendererType() {
        return this.#renderer.type;
    }

    // #endregion parameters

    // #region pause controller

    #pause = new PauseController();
    get paused() {
        return this.#pause.paused;
    }
    get writable() {
        return this.#pause.writable;
    }

    // #endregion pause controller

    // #region size

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

    // #endregion size

    // #region raw decoder

    #rawDecoder = new VideoDecoderStream();
    /**
     * Gets the number of frames waiting to be decoded.
     */
    get decodeQueueSize() {
        return this.#rawDecoder.decodeQueueSize;
    }
    /**
     * Gets an event when a frame is dequeued (either decoded or discarded).
     */
    get onDequeue() {
        return this.#rawDecoder.onDequeue;
    }
    /**
     * Gets the number of frames decoded by the decoder.
     */
    get framesDecoded() {
        return this.#rawDecoder.framesDecoded;
    }
    /**
     * Gets the number of frames skipped by the decoder.
     */
    get framesSkippedDecoding() {
        return this.#rawDecoder.framesSkipped;
    }

    // #endregion raw decoder

    #timestampTransforms = new TimestampTransforms();
    /**
     * Gets the total time spent processing and decoding frames in milliseconds.
     */
    get totalDecodeTime() {
        return this.#timestampTransforms.totalDecodeTime;
    }

    // #region renderer

    #renderController = new RendererController();
    /**
     * Gets the number of frames that have been drawn on the renderer.
     */
    get framesRendered() {
        return this.#renderController.framesRendered;
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
        return this.#renderController.framesDisplayed;
    }
    /**
     * Gets the number of frames that wasn't drawn on the renderer
     * because the renderer can't keep up
     */
    get framesSkippedRendering() {
        return this.#renderController.framesSkippedRendering;
    }

    // #endregion renderer

    /**
     * Create a new WebCodecs video decoder.
     */
    constructor({
        codec,
        renderer = new AutoCanvasRenderer(),
        hardwareAcceleration = "no-preference",
        optimizeForLatency = true,
    }: WebCodecsVideoDecoder.Options) {
        this.#type =
            hardwareAcceleration !== "prefer-software"
                ? "hardware"
                : "software";
        this.#codec = codec;
        this.#renderer = renderer;

        let codecTransform: CodecTransformStream;
        switch (this.#codec) {
            case ScrcpyVideoCodecId.H264:
                codecTransform = new H264TransformStream();
                break;
            case ScrcpyVideoCodecId.H265:
                codecTransform = new H265TransformStream();
                break;
            case ScrcpyVideoCodecId.AV1:
                codecTransform = new Av1TransformStream();
                break;
            default:
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                throw new Error(`Unsupported codec: ${this.#codec}`);
        }

        void this.#pause.readable
            // Add timestamp
            .pipeThrough(this.#timestampTransforms.addTimestamp)
            // Convert Scrcpy packets to `VideoDecoder` config/chunk
            .pipeThrough(codecTransform)
            // Insert extra `VideoDecoder` config and intercept size changes
            .pipeThrough(
                new InspectStream((chunk): undefined => {
                    if ("codec" in chunk) {
                        chunk.hardwareAcceleration = hardwareAcceleration;
                        chunk.optimizeForLatency = optimizeForLatency;

                        this.#size.setSize(chunk.codedWidth, chunk.codedHeight);
                    }
                }),
            )
            // Decode `VideoDecoder` config/chunk to `VideoFrame`s
            .pipeThrough(this.#rawDecoder)
            // Track decoding time and filter skipped frames
            .pipeThrough(this.#timestampTransforms.consumeTimestamp)
            // Skip frames if renderer can't keep up
            .pipeThrough(this.#renderController)
            // Render
            .pipeTo(renderer.writable)
            // Errors will be handled by source stream
            .catch(noop);
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

    async snapshot(options?: ImageEncodeOptions) {
        const frame = this.#renderController.captureFrame;
        if (!frame) {
            return undefined;
        }

        // First check if the renderer can provide a snapshot natively
        const blob = await this.#renderer.snapshot?.(options);
        if (blob) {
            return blob;
        }

        // Create a BitmapVideoFrameRenderer to draw the frame
        const renderer = new BitmapVideoFrameRenderer();
        try {
            const writer = renderer.writable.getWriter();
            // Draw the frame
            // `renderer` will close the passed in `frame`, so make a clone
            await writer.write(frame.clone());
            await writer.close();
            // BitmapVideoFrameRenderer.snapshot will definitely return a value
            return await renderer.snapshot(options);
        } finally {
            renderer.dispose();
        }
    }

    dispose() {
        // Most cleanup happens automatically when `writable` ends
        // (in each stream's `close` callback).
        // This method cleanup things that still available after `writable` ends

        this.#pause.dispose();
        this.#size.dispose();
        this.#renderController.dispose();
        this.#renderer.dispose?.();
    }
}

export namespace WebCodecsVideoDecoder {
    export interface Options extends Pick<
        VideoDecoderConfig,
        "hardwareAcceleration" | "optimizeForLatency"
    > {
        /**
         * The video codec to decode
         */
        codec: ScrcpyVideoCodecId;

        renderer?: VideoFrameRenderer | undefined;
    }
}
