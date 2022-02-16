import type { Disposable } from "@yume-chan/event";
import type { AndroidCodecLevel, AndroidCodecProfile } from "../codec";

export interface H264EncodingInfo {
    profileIndex: number;
    constraintSet: number;
    levelIndex: number;

    encodedWidth: number;
    encodedHeight: number;

    cropLeft: number;
    cropRight: number;

    cropTop: number;
    cropBottom: number;

    croppedWidth: number;
    croppedHeight: number;
}

export interface H264Decoder extends Disposable {
    readonly maxProfile: AndroidCodecProfile | undefined;
    readonly maxLevel: AndroidCodecLevel | undefined;

    readonly renderer: HTMLElement;

    changeEncoding(size: H264EncodingInfo): void;

    feedData(data: ArrayBuffer): void;
}

export interface H264DecoderConstructor {
    new(): H264Decoder;
}
