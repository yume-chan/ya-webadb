import type {
    ScrcpyMediaStreamDataPacket,
    ScrcpyMediaStreamPacket,
} from "@yume-chan/scrcpy";
import {
    ScrcpyVideoCodecId,
    h264ParseConfiguration,
    h265ParseConfiguration,
} from "@yume-chan/scrcpy";
import type {
    ScrcpyVideoDecoder,
    ScrcpyVideoDecoderCapability,
} from "@yume-chan/scrcpy-decoder-tinyh264";
import { WritableStream } from "@yume-chan/stream-extra";

function toHex(value: number) {
    return value.toString(16).padStart(2, "0").toUpperCase();
}

function toUint32Le(data: Uint8Array, offset: number) {
    return (
        data[offset]! |
        (data[offset + 1]! << 8) |
        (data[offset + 2]! << 16) |
        (data[offset + 3]! << 24)
    );
}

export class WebCodecsDecoder implements ScrcpyVideoDecoder {
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

    #renderer: HTMLCanvasElement;
    get renderer() {
        return this.#renderer;
    }

    #frameRendered = 0;
    get frameRendered() {
        return this.#frameRendered;
    }

    #frameSkipped = 0;
    get frameSkipped() {
        return this.#frameSkipped;
    }

    #context: CanvasRenderingContext2D;
    #decoder: VideoDecoder;
    #config: Uint8Array | undefined;

    #currentFrameRendered = false;
    #animationFrameId = 0;

    constructor(codec: ScrcpyVideoCodecId) {
        this.#codec = codec;

        this.#renderer = document.createElement("canvas");

        this.#context = this.#renderer.getContext("2d")!;
        this.#decoder = new VideoDecoder({
            output: (frame) => {
                if (this.#currentFrameRendered) {
                    this.#frameSkipped += 1;
                } else {
                    this.#currentFrameRendered = true;
                    this.#frameRendered += 1;
                }

                // PERF: H.264 renderer may draw multiple frames in one vertical sync interval to minimize latency.
                // When multiple frames are drawn in one vertical sync interval,
                // only the last one is visible to users.
                // But this ensures users can always see the most up-to-date screen.
                // This is also the behavior of official Scrcpy client.
                // https://github.com/Genymobile/scrcpy/issues/3679
                this.#context.drawImage(frame, 0, 0);
                frame.close();
            },
            error(e) {
                void e;
            },
        });

        this.#writable = new WritableStream<ScrcpyMediaStreamPacket>({
            write: (packet) => {
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
        this.#currentFrameRendered = false;
        this.#animationFrameId = requestAnimationFrame(this.#onFramePresented);
    };

    #configure(data: Uint8Array) {
        switch (this.#codec) {
            case ScrcpyVideoCodecId.H264: {
                const {
                    profileIndex,
                    constraintSet,
                    levelIndex,
                    croppedWidth,
                    croppedHeight,
                } = h264ParseConfiguration(data);

                this.#renderer.width = croppedWidth;
                this.#renderer.height = croppedHeight;

                // https://www.rfc-editor.org/rfc/rfc6381#section-3.3
                // ISO Base Media File Format Name Space
                const codec = `avc1.${[profileIndex, constraintSet, levelIndex]
                    .map(toHex)
                    .join("")}`;
                this.#decoder.configure({
                    codec: codec,
                    optimizeForLatency: true,
                });
                break;
            }
            case ScrcpyVideoCodecId.H265: {
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

                this.#renderer.width = croppedWidth;
                this.#renderer.height = croppedHeight;

                const codec = [
                    "hev1",
                    ["", "A", "B", "C"][generalProfileSpace]! +
                        generalProfileIndex.toString(),
                    toUint32Le(generalProfileCompatibilitySet, 0).toString(16),
                    (generalTierFlag ? "H" : "L") +
                        generalLevelIndex.toString(),
                    toUint32Le(generalConstraintSet, 0)
                        .toString(16)
                        .toUpperCase(),
                    toUint32Le(generalConstraintSet, 4)
                        .toString(16)
                        .toUpperCase(),
                ].join(".");
                this.#decoder.configure({
                    codec,
                    optimizeForLatency: true,
                });
                break;
            }
        }
        this.#config = data;
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
