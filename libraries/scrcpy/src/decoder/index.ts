import { Disposable } from "@yume-chan/event";
import type { FrameSize } from "../client";
import type { AndroidCodecLevel, AndroidCodecProfile } from "../codec";

export interface H264Decoder extends Disposable {
    readonly maxProfile: AndroidCodecProfile;

    readonly maxLevel: AndroidCodecLevel;

    readonly element: HTMLElement;

    setSize(size: FrameSize): void;

    feed(data: ArrayBuffer): void;
}

export interface H264DecoderConstructor {
    new(): H264Decoder;
}

export * from './tinyh264';
export * from './web-codecs';
