import type { ValueOrPromise } from "@yume-chan/struct";
import type { H264Decoder } from "..";
import type { FrameSize } from "../../client";
import { AndroidCodecLevel, AndroidCodecProfile } from "../../codec";

function toHex(value: number) {
    return value.toString(16).padStart(2, '0').toUpperCase();
}

export class WebCodecsDecoder implements H264Decoder {
    public readonly maxProfile = AndroidCodecProfile.High;

    public readonly maxLevel = AndroidCodecLevel.Level5;

    private _element: HTMLCanvasElement;
    public get element() { return this._element; }

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

    public setSize(size: FrameSize): ValueOrPromise<void> {
        const { sequenceParameterSet: { profile_idc, constraint_set, level_idc } } = size;

        this._element.width = size.croppedWidth;
        this._element.height = size.croppedHeight;

        // https://www.rfc-editor.org/rfc/rfc6381#section-3.3
        // ISO Base Media File Format Name Space
        const codec = `avc1.${[profile_idc, constraint_set, level_idc].map(toHex).join('')}`;
        this.decoder.configure({
            codec: codec,
            optimizeForLatency: true,
        });
    }

    feed(data: ArrayBuffer): ValueOrPromise<void> {
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
