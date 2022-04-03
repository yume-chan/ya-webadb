import { WritableStream } from '@yume-chan/adb';
import type { VideoStreamPacket } from "../../options/index.js";
import type { H264Configuration, H264Decoder } from "../types.js";

function toHex(value: number) {
    return value.toString(16).padStart(2, '0').toUpperCase();
}

export class WebCodecsDecoder implements H264Decoder {
    // Usually, browsers can decode most configurations,
    // So let device choose best profile and level for itself.
    public readonly maxProfile = undefined;
    public readonly maxLevel = undefined;

    private _writable: WritableStream<VideoStreamPacket>;
    public get writable() { return this._writable; }

    private _renderer: HTMLCanvasElement;
    public get renderer() { return this._renderer; }

    private _frameRendered = 0;
    public get frameRendered() { return this._frameRendered; }

    private context: CanvasRenderingContext2D;
    private decoder: VideoDecoder;

    // Limit FPS to system refresh rate
    private lastFrame: VideoFrame | undefined;
    private animationFrame: number = 0;

    public constructor() {
        this._renderer = document.createElement('canvas');

        this.context = this._renderer.getContext('2d')!;
        this.decoder = new VideoDecoder({
            output: (frame) => {
                if (this.lastFrame) {
                    this.lastFrame.close();
                }
                this.lastFrame = frame;

                if (!this.animationFrame) {
                    // Start render loop on first frame
                    this.render();
                }
            },
            error() { },
        });

        this._writable = new WritableStream<VideoStreamPacket>({
            write: async (packet) => {
                switch (packet.type) {
                    case 'configuration':
                        this.configure(packet.data);
                        break;
                    case 'frame':
                        this.decoder.decode(new EncodedVideoChunk({
                            // Treat `undefined` as `key`, otherwise won't decode.
                            type: packet.keyframe === false ? 'delta' : 'key',
                            timestamp: 0,
                            data: packet.data,
                        }));
                        break;
                }
            }
        });
    }

    private render = () => {
        if (this.lastFrame) {
            this._frameRendered += 1;
            this.context.drawImage(this.lastFrame, 0, 0);
            this.lastFrame.close();
            this.lastFrame = undefined;
        }

        this.animationFrame = requestAnimationFrame(this.render);
    };

    private configure(config: H264Configuration) {
        const { profileIndex, constraintSet, levelIndex } = config;

        this._renderer.width = config.croppedWidth;
        this._renderer.height = config.croppedHeight;

        // https://www.rfc-editor.org/rfc/rfc6381#section-3.3
        // ISO Base Media File Format Name Space
        const codec = `avc1.${[profileIndex, constraintSet, levelIndex].map(toHex).join('')}`;
        this.decoder.configure({
            codec: codec,
            optimizeForLatency: true,
        });
    }

    public dispose() {
        cancelAnimationFrame(this.animationFrame);
        this.decoder.close();
    }
}
