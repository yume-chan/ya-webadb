import type {
    H264Configuration,
    ScrcpyVideoStreamPacket,
} from "@yume-chan/scrcpy";
import { WritableStream } from "@yume-chan/stream-extra";

function toHex(value: number) {
    return value.toString(16).padStart(2, "0").toUpperCase();
}

export class WebCodecsDecoder {
    // Usually, browsers can decode most configurations,
    // So let device choose best profile and level for itself.
    public readonly maxProfile = undefined;
    public readonly maxLevel = undefined;

    private _writable: WritableStream<ScrcpyVideoStreamPacket>;
    public get writable() {
        return this._writable;
    }

    private _renderer: HTMLCanvasElement;
    public get renderer() {
        return this._renderer;
    }

    private _frameRendered = 0;
    public get frameRendered() {
        return this._frameRendered;
    }

    private _frameSkipped = 0;
    public get frameSkipped() {
        return this._frameSkipped;
    }

    private context: CanvasRenderingContext2D;
    private decoder: VideoDecoder;

    private currentFrameRendered = false;
    private animationFrameId = 0;

    public constructor() {
        this._renderer = document.createElement("canvas");

        this.context = this._renderer.getContext("2d")!;
        this.decoder = new VideoDecoder({
            output: (frame) => {
                if (this.currentFrameRendered) {
                    this._frameSkipped += 1;
                } else {
                    this.currentFrameRendered = true;
                    this._frameRendered += 1;
                }

                // PERF: H.264 renderer may draw multiple frames in one vertical sync interval to minimize latency.
                // When multiple frames are drawn in one vertical sync interval,
                // only the last one is visible to users.
                // But this ensures users can always see the most up-to-date screen.
                // This is also the behavior of official Scrcpy client.
                // https://github.com/Genymobile/scrcpy/issues/3679
                this.context.drawImage(frame, 0, 0);
                frame.close();
            },
            error(e) {
                void e;
            },
        });

        this._writable = new WritableStream<ScrcpyVideoStreamPacket>({
            write: (packet) => {
                switch (packet.type) {
                    case "configuration":
                        this.configure(packet.data);
                        break;
                    case "frame":
                        this.decoder.decode(
                            new EncodedVideoChunk({
                                // Treat `undefined` as `key`, otherwise won't decode.
                                type:
                                    packet.keyframe === false ? "delta" : "key",
                                timestamp: 0,
                                data: packet.data,
                            })
                        );
                        break;
                }
            },
        });

        this.onFramePresented();
    }

    private onFramePresented = () => {
        this.currentFrameRendered = false;
        this.animationFrameId = requestAnimationFrame(this.onFramePresented);
    };

    private configure(config: H264Configuration) {
        const { profileIndex, constraintSet, levelIndex } = config;

        this._renderer.width = config.croppedWidth;
        this._renderer.height = config.croppedHeight;

        // https://www.rfc-editor.org/rfc/rfc6381#section-3.3
        // ISO Base Media File Format Name Space
        const codec = `avc1.${[profileIndex, constraintSet, levelIndex]
            .map(toHex)
            .join("")}`;
        this.decoder.configure({
            codec: codec,
            optimizeForLatency: true,
        });
    }

    public dispose() {
        cancelAnimationFrame(this.animationFrameId);
        this.decoder.close();
    }
}
