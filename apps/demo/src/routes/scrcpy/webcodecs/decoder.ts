/// <reference path="web-codecs.d.ts"/>

import { ValueOrPromise } from "@yume-chan/struct";
import { Decoder } from '../decoder';
import { FrameSize } from "../server";

function toHex(value: number) {
    return value.toString(16).padStart(2, '0').toUpperCase();
}

export class WebCodecsDecoder implements Decoder {
    private decoder: VideoDecoder;
    private context: CanvasRenderingContext2D;

    public constructor(canvas: HTMLCanvasElement) {
        this.context = canvas.getContext('2d')!;
        this.decoder = new VideoDecoder({
            output: (frame) => {
                this.context.drawImage(frame, 0, 0);
                frame.close();
            },
            error() { },
        });
    }

    public configure(config: FrameSize): ValueOrPromise<void> {
        const { sequenceParameterSet: { profile_idc, constraint_set, level_idc } } = config;

        // https://www.rfc-editor.org/rfc/rfc6381#section-3.3
        // ISO Base Media File Format Name Space
        const codec = `avc1.${[profile_idc, constraint_set, level_idc].map(toHex).join('')}`;
        this.decoder.configure({
            codec: codec,
            optimizeForLatency: true,
        });
    }

    decode(data: BufferSource): ValueOrPromise<void> {
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
