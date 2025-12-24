import { StickyEventEmitter } from "@yume-chan/event";
import type { ScrcpyMediaStreamPacket } from "@yume-chan/scrcpy";
import { ScrcpyVideoCodecId } from "@yume-chan/scrcpy";
import type {
    ScrcpyVideoDecoder,
    ScrcpyVideoDecoderCapability,
} from "@yume-chan/scrcpy-decoder-tinyh264";
import type { WritableStreamDefaultController } from "@yume-chan/stream-extra";
import { WritableStream } from "@yume-chan/stream-extra";

import { Av1Codec, H264Decoder, H265Decoder } from "./codec/index.js";
import type { CodecDecoder, CodecDecoderOptions } from "./codec/type.js";
import { Pool } from "./pool.js";
import type { VideoFrameRenderer } from "./render/index.js";
import { VideoFrameCapturer } from "./snapshot.js";

const VideoFrameCapturerPool =
    /* #__PURE__ */
    new Pool(() => new VideoFrameCapturer(), 4);

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

    #codec: ScrcpyVideoCodecId;
    get codec() {
        return this.#codec;
    }

    #renderer: VideoFrameRenderer;
    get renderer() {
        return this.#renderer;
    }

    #options: CodecDecoderOptions;

    #codecDecoder: CodecDecoder;

    #writable: WritableStream<ScrcpyMediaStreamPacket>;
    get writable() {
        return this.#writable;
    }

    #error: Error | undefined;
    #controller!: WritableStreamDefaultController;

    #framesDraw = 0;
    #framesPresented = 0;
    get framesRendered() {
        return this.#framesPresented;
    }

    #framesSkipped = 0;
    get framesSkipped() {
        return this.#framesSkipped;
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

    #decoder: VideoDecoder;

    #drawing = false;
    #nextFrame: VideoFrame | undefined;
    #captureFrame: VideoFrame | undefined;

    #animationFrameId = 0;

    /**
     * Create a new WebCodecs video decoder.
     */
    constructor({
        codec,
        renderer,
        ...options
    }: WebCodecsVideoDecoder.Options) {
        this.#codec = codec;
        this.#renderer = renderer;
        this.#options = options;

        this.#decoder = new VideoDecoder({
            output: (frame) => {
                this.#captureFrame?.close();
                // PERF: `VideoFrame#clone` is cheap
                this.#captureFrame = frame.clone();

                if (this.#drawing) {
                    if (this.#nextFrame) {
                        this.#nextFrame.close();
                        this.#framesSkipped += 1;
                    }
                    this.#nextFrame = frame;
                    return;
                }

                void this.#draw(frame);
            },
            error: (error) => {
                this.#setError(error);
            },
        });

        switch (this.#codec) {
            case ScrcpyVideoCodecId.H264:
                this.#codecDecoder = new H264Decoder(
                    this.#decoder,
                    this.#updateSize,
                    this.#options,
                );
                break;
            case ScrcpyVideoCodecId.H265:
                this.#codecDecoder = new H265Decoder(
                    this.#decoder,
                    this.#updateSize,
                    this.#options,
                );
                break;
            case ScrcpyVideoCodecId.AV1:
                this.#codecDecoder = new Av1Codec(
                    this.#decoder,
                    this.#updateSize,
                    this.#options,
                );
                break;
            default:
                throw new Error(`Unsupported codec: ${this.#codec as number}`);
        }

        this.#writable = new WritableStream<ScrcpyMediaStreamPacket>({
            start: (controller) => {
                if (this.#error) {
                    controller.error(this.#error);
                } else {
                    this.#controller = controller;
                }
            },
            write: (packet) => {
                this.#codecDecoder.decode(packet);
            },
        });

        this.#handleAnimationFrame();
    }

    #setError(error: Error) {
        if (this.#controller) {
            try {
                this.#controller.error(error);
            } catch {
                // ignore
            }
        } else {
            this.#error = error;
        }
    }

    async #draw(frame: VideoFrame) {
        try {
            this.#drawing = true;
            // PERF: Draw every frame to minimize latency at cost of performance.
            // When multiple frames are drawn in one vertical sync interval,
            // only the last one is visible to users.
            // But this ensures users can always see the most up-to-date screen.
            // This is also the behavior of official Scrcpy client.
            // https://github.com/Genymobile/scrcpy/issues/3679
            this.#updateSize(frame.displayWidth, frame.displayHeight);
            await this.#renderer.draw(frame);
            this.#framesDraw += 1;
            frame.close();

            if (this.#nextFrame) {
                const frame = this.#nextFrame;
                this.#nextFrame = undefined;
                await this.#draw(frame);
            }

            this.#drawing = false;
        } catch (error) {
            this.#setError(error as Error);
        }
    }

    #updateSize = (width: number, height: number) => {
        this.#renderer.setSize(width, height);
        this.#width = width;
        this.#height = height;
        this.#sizeChanged.fire({ width, height });
    };

    #handleAnimationFrame = () => {
        if (this.#framesDraw > 0) {
            this.#framesPresented += 1;
            this.#framesSkipped += this.#framesDraw - 1;
            this.#framesDraw = 0;
        }
        this.#animationFrameId = requestAnimationFrame(
            this.#handleAnimationFrame,
        );
    };

    async snapshot() {
        const frame = this.#captureFrame;
        if (!frame) {
            return undefined;
        }

        const capturer = await VideoFrameCapturerPool.borrow();
        const result = await capturer.capture(frame);
        VideoFrameCapturerPool.return(capturer);
        return result;
    }

    dispose() {
        cancelAnimationFrame(this.#animationFrameId);
        if (this.#decoder.state !== "closed") {
            this.#decoder.close();
        }
        this.#nextFrame?.close();
        this.#captureFrame?.close();
    }
}

export namespace WebCodecsVideoDecoder {
    export interface Options extends CodecDecoderOptions {
        /**
         * The video codec to decode
         */
        codec: ScrcpyVideoCodecId;

        renderer: VideoFrameRenderer;
    }
}
