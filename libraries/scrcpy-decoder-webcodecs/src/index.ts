import { EventEmitter } from "@yume-chan/event";
import { getUint32LittleEndian } from "@yume-chan/no-data-view";
import {
    Av1,
    ScrcpyVideoCodecId,
    h264ParseConfiguration,
    h265ParseConfiguration,
    type ScrcpyMediaStreamDataPacket,
    type ScrcpyMediaStreamPacket,
} from "@yume-chan/scrcpy";
import type {
    ScrcpyVideoDecoder,
    ScrcpyVideoDecoderCapability,
} from "@yume-chan/scrcpy-decoder-tinyh264";
import {
    WritableStream,
    type WritableStreamDefaultController,
} from "@yume-chan/stream-extra";

import { BitmapFrameRenderer } from "./bitmap.js";
import type { FrameRenderer } from "./renderer.js";
import { WebGLFrameRenderer } from "./webgl.js";

function hexDigits(value: number) {
    return value.toString(16).toUpperCase();
}

function hexTwoDigits(value: number) {
    return value.toString(16).toUpperCase().padStart(2, "0");
}

function decimalTwoDigits(value: number) {
    return value.toString(10).padStart(2, "0");
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

    #writable: WritableStream<ScrcpyMediaStreamPacket>;
    get writable() {
        return this.#writable;
    }

    #canvas: HTMLCanvasElement;
    get renderer() {
        return this.#canvas;
    }

    #frameRendered = 0;
    get frameRendered() {
        return this.#frameRendered;
    }

    #frameSkipped = 0;
    get frameSkipped() {
        return this.#frameSkipped;
    }

    #sizeChanged = new EventEmitter<{ width: number; height: number }>();
    get sizeChanged() {
        return this.#sizeChanged.event;
    }

    #decoder: VideoDecoder;
    #config: Uint8Array | undefined;
    #renderer: FrameRenderer;

    #currentFrameRendered = false;
    #animationFrameId = 0;

    constructor(codec: ScrcpyVideoCodecId) {
        this.#codec = codec;

        this.#canvas = document.createElement("canvas");

        try {
            this.#renderer = new WebGLFrameRenderer(this.#canvas);
        } catch {
            this.#renderer = new BitmapFrameRenderer(this.#canvas);
        }

        this.#decoder = new VideoDecoder({
            output: (frame) => {
                if (this.#currentFrameRendered) {
                    this.#frameRendered += 1;
                } else {
                    this.#frameSkipped += 1;
                }
                this.#currentFrameRendered = false;

                if (
                    frame.displayWidth !== this.#canvas.width ||
                    frame.displayHeight !== this.#canvas.height
                ) {
                    this.#canvas.width = frame.displayWidth;
                    this.#canvas.height = frame.displayHeight;
                    this.#sizeChanged.fire({
                        width: frame.displayWidth,
                        height: frame.displayHeight,
                    });
                }

                // PERF: H.264 renderer may draw multiple frames in one vertical sync interval to minimize latency.
                // When multiple frames are drawn in one vertical sync interval,
                // only the last one is visible to users.
                // But this ensures users can always see the most up-to-date screen.
                // This is also the behavior of official Scrcpy client.
                // https://github.com/Genymobile/scrcpy/issues/3679
                this.#renderer.draw(frame);
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
                if (this.#codec === ScrcpyVideoCodecId.AV1) {
                    if (packet.type === "configuration") {
                        return;
                    }

                    this.#configureAv1(packet.data);
                    this.#decoder.decode(
                        new EncodedVideoChunk({
                            // Treat `undefined` as `key`, otherwise won't decode.
                            type: packet.keyframe === false ? "delta" : "key",
                            timestamp: 0,
                            data: packet.data,
                        }),
                    );
                    return;
                }

                switch (packet.type) {
                    case "configuration":
                        this.#configure(packet.data);
                        break;
                    case "data":
                        this.#decode(packet);
                        break;
                }
            },
        });

        this.#onFramePresented();
    }

    #onFramePresented = () => {
        this.#currentFrameRendered = true;
        this.#animationFrameId = requestAnimationFrame(this.#onFramePresented);
    };

    #configureH264(data: Uint8Array) {
        const {
            profileIndex,
            constraintSet,
            levelIndex,
            croppedWidth,
            croppedHeight,
        } = h264ParseConfiguration(data);

        this.#canvas.width = croppedWidth;
        this.#canvas.height = croppedHeight;
        this.#sizeChanged.fire({
            width: croppedWidth,
            height: croppedHeight,
        });

        // https://www.rfc-editor.org/rfc/rfc6381#section-3.3
        // ISO Base Media File Format Name Space
        const codec =
            "avc1." +
            hexTwoDigits(profileIndex) +
            hexTwoDigits(constraintSet) +
            hexTwoDigits(levelIndex);
        this.#decoder.configure({
            codec: codec,
            optimizeForLatency: true,
        });
    }

    #configureH265(data: Uint8Array) {
        const {
            generalProfileSpace,
            generalProfileIndex,
            generalProfileCompatibilitySet,
            generalTierFlag,
            generalLevelIndex,
            generalConstraintSet,
            croppedWidth,
            croppedHeight,
        } = h265ParseConfiguration(data);

        this.#canvas.width = croppedWidth;
        this.#canvas.height = croppedHeight;
        this.#sizeChanged.fire({
            width: croppedWidth,
            height: croppedHeight,
        });

        const codec = [
            "hev1",
            ["", "A", "B", "C"][generalProfileSpace]! +
                generalProfileIndex.toString(),
            hexDigits(getUint32LittleEndian(generalProfileCompatibilitySet, 0)),
            (generalTierFlag ? "H" : "L") + generalLevelIndex.toString(),
            ...Array.from(generalConstraintSet, hexDigits),
        ].join(".");
        this.#decoder.configure({
            codec,
            optimizeForLatency: true,
        });
    }

    #configureAv1(data: Uint8Array) {
        const parser = new Av1(data);
        const sequenceHeader = parser.searchSequenceHeaderObu();

        if (!sequenceHeader) {
            return;
        }

        const {
            seq_profile: seqProfile,
            seq_level_idx: [seqLevelIdx = 0],
            max_frame_width_minus_1,
            max_frame_height_minus_1,
            color_config: {
                BitDepth,
                mono_chrome: monoChrome,
                subsampling_x: subsamplingX,
                subsampling_y: subsamplingY,
                chroma_sample_position: chromaSamplePosition,
                color_description_present_flag,
            },
        } = sequenceHeader;

        let colorPrimaries: Av1.ColorPrimaries;
        let transferCharacteristics: Av1.TransferCharacteristics;
        let matrixCoefficients: Av1.MatrixCoefficients;
        let colorRange: boolean;
        if (color_description_present_flag) {
            ({
                color_primaries: colorPrimaries,
                transfer_characteristics: transferCharacteristics,
                matrix_coefficients: matrixCoefficients,
                color_range: colorRange,
            } = sequenceHeader.color_config);
        } else {
            colorPrimaries = Av1.ColorPrimaries.Bt709;
            transferCharacteristics = Av1.TransferCharacteristics.Bt709;
            matrixCoefficients = Av1.MatrixCoefficients.Bt709;
            colorRange = false;
        }

        const width = max_frame_width_minus_1 + 1;
        const height = max_frame_height_minus_1 + 1;

        this.#canvas.width = width;
        this.#canvas.height = height;
        this.#sizeChanged.fire({ width, height });

        const codec = [
            "av01",
            seqProfile.toString(16),
            decimalTwoDigits(seqLevelIdx) +
                (sequenceHeader.seq_tier[0] ? "H" : "M"),
            decimalTwoDigits(BitDepth),
            monoChrome ? "1" : "0",
            (subsamplingX ? "1" : "0") +
                (subsamplingY ? "1" : "0") +
                chromaSamplePosition.toString(),
            decimalTwoDigits(colorPrimaries),
            decimalTwoDigits(transferCharacteristics),
            decimalTwoDigits(matrixCoefficients),
            colorRange ? "1" : "0",
        ].join(".");
        this.#decoder.configure({
            codec,
            optimizeForLatency: true,
        });
    }

    #configure(data: Uint8Array) {
        switch (this.#codec) {
            case ScrcpyVideoCodecId.H264:
                this.#configureH264(data);
                this.#config = data;
                break;
            case ScrcpyVideoCodecId.H265:
                this.#configureH265(data);
                this.#config = data;
                break;
            case ScrcpyVideoCodecId.AV1:
                // AV1 configuration is in normal stream
                break;
        }
    }

    #decode(packet: ScrcpyMediaStreamDataPacket) {
        if (this.#decoder.state !== "configured") {
            return;
        }

        // WebCodecs requires configuration data to be with the first frame.
        // https://www.w3.org/TR/webcodecs-avc-codec-registration/#encodedvideochunk-type
        let data: Uint8Array;
        if (this.#config !== undefined) {
            data = new Uint8Array(
                this.#config.byteLength + packet.data.byteLength,
            );
            data.set(this.#config, 0);
            data.set(packet.data, this.#config.byteLength);
            this.#config = undefined;
        } else {
            data = packet.data;
        }

        this.#decoder.decode(
            new EncodedVideoChunk({
                // Treat `undefined` as `key`, otherwise won't decode.
                type: packet.keyframe === false ? "delta" : "key",
                timestamp: 0,
                data,
            }),
        );
    }

    dispose() {
        cancelAnimationFrame(this.#animationFrameId);
        if (this.#decoder.state !== "closed") {
            this.#decoder.close();
        }
    }
}
