import { Disposable } from "@yume-chan/event";
import type { AndroidCodecLevel, AndroidCodecProfile } from "../codec";
import type { H264EncodingInfo } from "../options";

export interface H264Decoder extends Disposable {
    readonly maxProfile: AndroidCodecProfile;

    readonly maxLevel: AndroidCodecLevel;

    readonly renderer: HTMLElement;

    changeEncoding(size: H264EncodingInfo): void;

    feedData(data: ArrayBuffer): void;
}

export interface H264DecoderConstructor {
    new(): H264Decoder;
}

export * from './tinyh264';
export * from './web-codecs';
