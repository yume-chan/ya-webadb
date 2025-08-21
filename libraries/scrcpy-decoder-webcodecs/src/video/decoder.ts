import type { ScrcpyMediaStreamPacket } from "@yume-chan/scrcpy";
import { ScrcpyVideoCodecId, ScrcpyVideoSizeImpl } from "@yume-chan/scrcpy";
import type {
    ScrcpyVideoDecoder,
    ScrcpyVideoDecoderCapability,
} from "@yume-chan/scrcpy-decoder-tinyh264";
import {
    PauseControllerImpl,
    PerformanceCounterImpl,
} from "@yume-chan/scrcpy-decoder-tinyh264";
import type { WritableStreamDefaultController } from "@yume-chan/stream-extra";
import { WritableStream } from "@yume-chan/stream-extra";

import { Av1Codec, H264Decoder, H265Decoder } from "./codec/index.js";
import type { CodecDecoder } from "./codec/type.js";
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

    #error: Error | undefined;

    #writable: WritableStream<ScrcpyMediaStreamPacket>;
    #controller!: WritableStreamDefaultController;
    get writable() {
        return this.#writable;
    }

    #renderer: VideoFrameRenderer;
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

    #rawDecoder: VideoDecoder;
    #decoder: CodecDecoder;

    #drawing = false;
    #nextFrame: VideoFrame | undefined;
    #captureFrame: VideoFrame | undefined;

    /**
     * Create a new WebCodecs video decoder.
     */
    constructor({ codec, renderer }: WebCodecsVideoDecoder.Options) {
        this.#codec = codec;

        this.#renderer = renderer;

        this.#rawDecoder = new VideoDecoder({
            output: (frame) => {
                if (this.#error) {
                    frame.close();
                    return;
                }

                // Skip rendering frames while resuming from pause
                if (frame.timestamp === 0) {
                    frame.close();
                    return;
                }

                this.#captureFrame?.close();
                // PERF: `VideoFrame#clone` is cheap
                this.#captureFrame = frame.clone();

                void this.#draw(frame);
            },
            error: (error) => {
                this.#setError(error);
            },
        });

        switch (this.#codec) {
            case ScrcpyVideoCodecId.H264:
                this.#decoder = new H264Decoder(
                    this.#rawDecoder,
                    this.#updateSize,
                );
                break;
            case ScrcpyVideoCodecId.H265:
                this.#decoder = new H265Decoder(
                    this.#rawDecoder,
                    this.#updateSize,
                );
                break;
            case ScrcpyVideoCodecId.AV1:
                this.#decoder = new Av1Codec(
                    this.#rawDecoder,
                    this.#updateSize,
                );
                break;
            default:
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                throw new Error(`Unsupported codec: ${this.#codec}`);
        }

        this.#pause = new PauseControllerImpl(
            (packet) => this.#decoder.decode(packet),
            (packet, skipRendering) => {
                if (skipRendering) {
                    // Set `pts` to 0 as a marker for skipping rendering this frame
                    packet.pts = 0n;
                } else if (packet.pts === 0n) {
                    // Avoid valid `pts: 0` to be skipped
                    packet.pts = 1n;
                }
                return this.#decoder.decode(packet);
            },
        );

        this.#writable = new WritableStream<ScrcpyMediaStreamPacket>({
            start: (controller) => {
                if (this.#error) {
                    controller.error(this.#error);
                } else {
                    this.#controller = controller;
                }
            },
            write: this.#pause.write,
        });
    }

    #setError(error: Error) {
        this.dispose();
        this.#error = error;

        try {
            this.#controller?.error(error);
        } catch {
            // ignore
        }
    }

    async #draw(frame: VideoFrame) {
        try {
            if (this.#drawing) {
                if (this.#nextFrame) {
                    // Frame `n` is still drawing, frame `n + m` (m > 0) is waiting, and frame `n + m + 1` comes.
                    // Dispose frame `n + m` and set frame `n + m + 1` as the next frame.
                    this.#nextFrame.close();
                    this.#counter.increaseFramesSkipped();
                }
                this.#nextFrame = frame;
                return;
            }

            this.#drawing = true;

            this.#updateSize(frame.displayWidth, frame.displayHeight);

            // PERF: Draw every frame to minimize latency at cost of performance.
            // When multiple frames are drawn in one vertical sync interval,
            // only the last one is visible to users.
            // But this ensures users can always see the most up-to-date screen.
            // This is also the behavior of official Scrcpy client.
            // https://github.com/Genymobile/scrcpy/issues/3679
            await this.#renderer.draw(frame);
            frame.close();

            this.#counter.increaseFramesDrawn();

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
        this.#size.setSize(width, height);
    };

    async snapshot() {
        const frame = this.#captureFrame;
        if (!frame) {
            return undefined;
        }

        const capturer = await VideoFrameCapturerPool.borrow();
        try {
            return await capturer.capture(frame);
        } finally {
            VideoFrameCapturerPool.return(capturer);
        }
    }

    pause(): void {
        this.#pause.pause();
    }

    resume(): Promise<undefined> {
        return this.#pause.resume();
    }

    dispose() {
        this.#renderer.dispose();
        this.#counter.dispose();
        if (this.#rawDecoder.state !== "closed") {
            this.#rawDecoder.close();
        }
        this.#nextFrame?.close();
        this.#captureFrame?.close();
    }
}

export namespace WebCodecsVideoDecoder {
    export interface Options {
        /**
         * The video codec to decode
         */
        codec: ScrcpyVideoCodecId;

        renderer: VideoFrameRenderer;
    }
}
