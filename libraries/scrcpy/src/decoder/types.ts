import type { Disposable } from '@yume-chan/event';
import type { WritableStream } from '@yume-chan/stream-extra';

import type { AndroidCodecLevel, AndroidCodecProfile } from '../codec.js';
import type { ScrcpyVideoStreamPacket } from '../options/index.js';

export interface H264Configuration {
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
    readonly frameRendered: number;
    readonly writable: WritableStream<ScrcpyVideoStreamPacket>;
}

export interface H264DecoderConstructor {
    new(): H264Decoder;
}
