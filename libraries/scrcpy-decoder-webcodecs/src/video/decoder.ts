import { ScrcpyVideoCodecId, ScrcpyVideoSizeImpl } from "@yume-chan/scrcpy";
import type {
    ScrcpyVideoDecoder,
    ScrcpyVideoDecoderCapability,
} from "@yume-chan/scrcpy-decoder-tinyh264";
import { noop, PauseController } from "@yume-chan/scrcpy-decoder-tinyh264";
import { InspectStream, TransformStream } from "@yume-chan/stream-extra";

import { Av1Codec, H264Decoder, H265Decoder } from "./codec/index.js";
import type { CodecDecoder } from "./codec/type.js";
import type { VideoFrameRenderer } from "./render/index.js";
import { RendererController } from "./render/index.js";
import { increasingNow } from "./time.js";
import { VideoDecoderStream } from "./video-decoder-stream.js";

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

    #codec: ScrcpyVideoCodecId;
    get codec() {
        return this.#codec;
    }

    #renderer: VideoFrameRenderer;
    get renderer() {
        return this.#renderer;
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

    /**
     * Timestamp of the last frame to be skipped by pause controller.
     */
    #skipFramesUntil = 0;

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

    // This is not in `VideoDecoderStream` because
    // this time includes all pre-processing time,
    // and requires `EncodedVideoCHunk.timestamp` to contain
    // local time of when the frame is received,
    // which is set by this class.
    #totalDecodeTime = 0;
    /**
     * Gets the total time spent processing and decoding frames in milliseconds.
     */
    get totalDecodeTime() {
        return this.#totalDecodeTime;
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
    get framesPresented() {
        return this.#renderController.framesPresented;
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
        renderer,
        hardwareAcceleration = "no-preference",
        optimizeForLatency = true,
    }: WebCodecsVideoDecoder.Options) {
        this.#codec = codec;
        this.#renderer = renderer;

        let codecDecoder: CodecDecoder;
        switch (this.#codec) {
            case ScrcpyVideoCodecId.H264:
                codecDecoder = new H264Decoder();
                break;
            case ScrcpyVideoCodecId.H265:
                codecDecoder = new H265Decoder();
                break;
            case ScrcpyVideoCodecId.AV1:
                codecDecoder = new Av1Codec();
                break;
            default:
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                throw new Error(`Unsupported codec: ${this.#codec}`);
        }

        void this.#pause.readable
            // Add timestamp
            .pipeThrough(
                new TransformStream<PauseController.Output, CodecDecoder.Input>(
                    {
                        transform: (packet, controller) => {
                            if (packet.type === "configuration") {
                                controller.enqueue(packet);
                                return;
                            }

                            // Use `timestamp` to convey `skipRendering` to later step
                            // and track total decoding time
                            const timestamp = increasingNow();

                            if (packet.skipRendering) {
                                this.#skipFramesUntil = timestamp;
                            }

                            controller.enqueue({
                                ...packet,
                                timestamp,
                            });
                        },
                    },
                ),
            )
            // Convert Scrcpy packets to `VideoDecoder` config/chunk
            .pipeThrough(codecDecoder)
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
            // Convert `VideoDecoder` config/chunk to `VideoFrame`s
            .pipeThrough(this.#rawDecoder)
            // Track decoding time and filter skipped frames
            .pipeThrough(
                new TransformStream<VideoFrame, VideoFrame>({
                    transform: (frame, controller) => {
                        // `frame.timestamp` is the same `EncodedVideoChunk.timestamp` set above
                        this.#totalDecodeTime +=
                            performance.now() - frame.timestamp;

                        // Don't count these frames as skipped rendering
                        if (frame.timestamp <= this.#skipFramesUntil) {
                            return;
                        }

                        controller.enqueue(frame);
                    },
                }),
            )
            // Skip frames if renderer can't keep up
            .pipeThrough(this.#renderController)
            // Render
            .pipeTo(renderer.writable)
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

    async snapshot() {
        return this.#renderController.snapshot();
    }

    dispose() {
        // Most cleanup happens automatically when `writable` ends
        // (in each stream's `close` callback).
        // This method cleanup things that still available after `writable` ends

        this.#size.dispose();
        this.#pause.dispose();
        this.#renderController.dispose();
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

        renderer: VideoFrameRenderer;
    }
}
