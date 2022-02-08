import type { ValueOrPromise } from "@yume-chan/struct";
import type { H264Decoder } from "..";
import { AndroidCodecLevel, AndroidCodecProfile } from "../../codec";
import type { H264EncodingInfo } from "../../options";

function toHex(value: number) {
    return value.toString(16).padStart(2, '0').toUpperCase();
}

export class WebCodecsDecoder implements H264Decoder {
    public readonly maxProfile = AndroidCodecProfile.High;

    public readonly maxLevel = AndroidCodecLevel.Level5;

    private _element: HTMLCanvasElement;
    public get renderer() { return this._element; }

    private context: CanvasRenderingContext2D;
    private decoder: VideoDecoder;

    public constructor() {
        this._element = document.createElement('canvas');

        this.context = this._element.getContext('2d')!;
        this.decoder = new VideoDecoder({
            output: (frame) => {
                this.context.drawImage(frame, 0, 0);
                frame.close();
            },
            error() { },
        });
    }

    public changeEncoding(encoding: H264EncodingInfo): ValueOrPromise<void> {
        const { profileIndex, constraintSet, levelIndex } = encoding;

        this._element.width = encoding.croppedWidth;
        this._element.height = encoding.croppedHeight;

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
