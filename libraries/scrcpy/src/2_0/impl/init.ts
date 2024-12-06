import type { ScrcpyOptionValue } from "../../base/index.js";

import type { PrevImpl } from "./prev.js";

export class InstanceId implements ScrcpyOptionValue {
    static readonly NONE = /* #__PURE__ */ new InstanceId(-1);

    static random(): InstanceId {
        // A random 31-bit unsigned integer
        return new InstanceId((Math.random() * 0x80000000) | 0);
    }

    value: number;

    constructor(value: number) {
        this.value = value;
    }

    toOptionValue(): string | undefined {
        if (this.value < 0) {
            return undefined;
        }
        return this.value.toString(16);
    }
}

export interface Init
    extends Omit<PrevImpl.Init, "bitRate" | "codecOptions" | "encoderName"> {
    scid?: InstanceId | string | undefined;

    videoCodec?: "h264" | "h265" | "av1";
    videoBitRate?: number;
    videoCodecOptions?: PrevImpl.CodecOptions | string | undefined;
    videoEncoder?: string | undefined;

    audio?: boolean;
    audioCodec?: "raw" | "opus" | "aac";
    audioBitRate?: number;
    audioCodecOptions?: PrevImpl.CodecOptions | string | undefined;
    audioEncoder?: string | undefined;

    listEncoders?: boolean;
    listDisplays?: boolean;
    sendCodecMeta?: boolean;
}
