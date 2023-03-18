import type { Disposable } from "@yume-chan/event";
import type { ScrcpyMediaStreamPacket } from "@yume-chan/scrcpy";
import type { WritableStream } from "@yume-chan/stream-extra";

export interface ScrcpyVideoDecoderCapability {
    maxProfile?: number;
    maxLevel?: number;
}

export interface ScrcpyVideoDecoder extends Disposable {
    readonly capabilities: Record<string, ScrcpyVideoDecoderCapability>;

    readonly renderer: HTMLElement;
    readonly frameRendered: number;
    readonly frameSkipped: number;
    readonly writable: WritableStream<ScrcpyMediaStreamPacket>;
}

export interface ScrcpyVideoDecoderConstructor {
    new (): ScrcpyVideoDecoder;
}
