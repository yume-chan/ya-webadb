import { EventEmitter } from "@yume-chan/event";
import type { ScrcpyMediaStreamPacket } from "@yume-chan/scrcpy";
import { ScrcpyVideoCodecId } from "@yume-chan/scrcpy";
import type {
    ScrcpyVideoDecoder,
    ScrcpyVideoDecoderCapability,
    TinyH264DecoderInit,
} from "@yume-chan/scrcpy-decoder-tinyh264";
import { createCanvas } from "@yume-chan/scrcpy-decoder-tinyh264";
import type { WritableStreamDefaultController } from "@yume-chan/stream-extra";
import { WritableStream } from "@yume-chan/stream-extra";

import { Av1Codec, H264Decoder, H265Decoder } from "./codec/index.js";
import type { CodecDecoder } from "./codec/type.js";
import type { FrameSink } from "./render/index.js";
import { BitmapFrameSink, WebGLFrameSink } from "./render/index.js";

export interface WebCodecsVideoDecoderInit extends TinyH264DecoderInit {
    /**
     * The video codec to decode
     */
    codec: ScrcpyVideoCodecId;

    /**
     * Whether to allow capturing the canvas content using APIs like `readPixels` and `toDataURL`.
     * Enable this option may reduce performance.
     */
    enableCapture?: boolean | undefined;
}

export class WebCodecsVideoDecoder implements ScrcpyVideoDecoder {
    static isSupported() {
        return typeof globalThis.VideoDecoder !== "undefined";
    }

    static readonly capabilities: Record<string, ScrcpyVideoDecoderCapability> =
        {
            h264: {},
            h265: {},
        };

    #codec: ScrcpyVideoCodecId;
    get codec() {
        return this.#codec;
    }

    #codecDecoder: CodecDecoder;

    #writable: WritableStream<ScrcpyMediaStreamPacket>;
    get writable() {
        return this.#writable;
    }

    #renderer: HTMLCanvasElement | OffscreenCanvas;
    get renderer() {
        return this.#renderer;
    }

    #frameRendered = 0;
    get framesRendered() {
        return this.#frameRendered;
    }

    #frameSkipped = 0;
    get framesSkipped() {
        return this.#frameSkipped;
    }

    #sizeChanged = new EventEmitter<{ width: number; height: number }>();
    get sizeChanged() {
        return this.#sizeChanged.event;
    }

    #decoder: VideoDecoder;
    #frameSink: FrameSink;

    #currentFrameRendered = false;
    #animationFrameId = 0;

    /**
     * Create a new WebCodecs video decoder.
     */
    constructor({ codec, canvas, enableCapture }: WebCodecsVideoDecoderInit) {
        this.#codec = codec;

        if (canvas) {
            this.#renderer = canvas;
        } else {
            this.#renderer = createCanvas();
        }

        try {
            this.#frameSink = new WebGLFrameSink(
                this.#renderer,
                !!enableCapture,
            );
        } catch {
            this.#frameSink = new BitmapFrameSink(this.#renderer);
        }

        this.#decoder = new VideoDecoder({
            output: (frame) => {
                if (this.#currentFrameRendered) {
                    this.#frameRendered += 1;
                } else {
                    this.#frameSkipped += 1;
                }
                this.#currentFrameRendered = false;

                // PERF: Draw every frame to minimize latency at cost of performance.
                // When multiple frames are drawn in one vertical sync interval,
                // only the last one is visible to users.
                // But this ensures users can always see the most up-to-date screen.
                // This is also the behavior of official Scrcpy client.
                // https://github.com/Genymobile/scrcpy/issues/3679
                this.#updateSize(frame.displayWidth, frame.displayHeight);
                this.#frameSink.draw(frame);
            },
            error(e) {
                if (controller) {
                    try {
                        controller.error(e);
                    } catch {
                        // ignore
                        // `controller` may already in error state
                    }
                } else {
                    error = e;
                }
            },
        });

        switch (this.#codec) {
            case ScrcpyVideoCodecId.H264:
                this.#codecDecoder = new H264Decoder(
                    this.#decoder,
                    this.#updateSize,
                );
                break;
            case ScrcpyVideoCodecId.H265:
                this.#codecDecoder = new H265Decoder(
                    this.#decoder,
                    this.#updateSize,
                );
                break;
            case ScrcpyVideoCodecId.AV1:
                this.#codecDecoder = new Av1Codec(
                    this.#decoder,
                    this.#updateSize,
                );
                break;
        }

        let error: Error | undefined;
        let controller: WritableStreamDefaultController | undefined;
        this.#writable = new WritableStream<ScrcpyMediaStreamPacket>({
            start: (_controller) => {
                if (error) {
                    _controller.error(error);
                } else {
                    controller = _controller;
                }
            },
            write: (packet) => {
                this.#codecDecoder.decode(packet);
            },
        });

        this.#onFramePresented();
    }

    #updateSize = (width: number, height: number) => {
        if (
            width !== this.#renderer.width ||
            height !== this.#renderer.height
        ) {
            this.#renderer.width = width;
            this.#renderer.height = height;
            this.#sizeChanged.fire({
                width: width,
                height: height,
            });
        }
    };

    #onFramePresented = () => {
        this.#currentFrameRendered = true;
        this.#animationFrameId = requestAnimationFrame(this.#onFramePresented);
    };

    dispose() {
        cancelAnimationFrame(this.#animationFrameId);
        if (this.#decoder.state !== "closed") {
            this.#decoder.close();
        }
    }
}
