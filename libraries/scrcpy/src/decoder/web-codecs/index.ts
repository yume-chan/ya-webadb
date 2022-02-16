import type { ValueOrPromise } from "@yume-chan/struct";
import { AndroidCodecLevel, AndroidCodecProfile } from "../../codec";
import type { H264Configuration, H264Decoder } from "../common";

function toHex(value: number) {
    return value.toString(16).padStart(2, '0').toUpperCase();
}

export class WebCodecsDecoder implements H264Decoder {
    public readonly maxProfile = AndroidCodecProfile.High;

    public readonly maxLevel = AndroidCodecLevel.Level5;

    private _writable = new WritableStream<ArrayBuffer>({
        write: async (chunk) => {
            this.decoder.decode(new EncodedVideoChunk({
                type: 'key',
                timestamp: 0,
                data: chunk,
            }));
        }
    });
    public get writable() { return this._writable; }

    private _renderer: HTMLCanvasElement;
    public get renderer() { return this._renderer; }

    private context: CanvasRenderingContext2D;
    private decoder: VideoDecoder;

    public constructor() {
        this._renderer = document.createElement('canvas');

        this.context = this._renderer.getContext('2d')!;
        this.decoder = new VideoDecoder({
            output: (frame) => {
                this.context.drawImage(frame, 0, 0);
                frame.close();
            },
            error() { },
        });
    }

    public configure(config: H264Configuration): ValueOrPromise<void> {
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

    feedData(data: ArrayBuffer): ValueOrPromise<void> {
        this.decoder.decode(new EncodedVideoChunk({
            type: 'key',
            timestamp: 0,
            data,
        }));
    }

    public dispose() {
        this.decoder.close();
    }
}
