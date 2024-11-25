import type { ReadableStream } from "@yume-chan/stream-extra";

import type { ScrcpyOptionValue } from "./option-value.js";

export class ScrcpyAudioCodec implements ScrcpyOptionValue {
    static readonly Opus = /* #__PURE__ */ new ScrcpyAudioCodec(
        "opus",
        0x6f_70_75_73,
        "audio/opus",
        "opus",
    );
    static readonly Aac = /* #__PURE__ */ new ScrcpyAudioCodec(
        "aac",
        0x00_61_61_63,
        "audio/aac",
        "mp4a.66",
    );
    static readonly Flac = /* #__PURE__ */ new ScrcpyAudioCodec(
        "flac",
        0x66_6c_61_63,
        "audio/flac",
        "flac",
    );
    static readonly Raw = /* #__PURE__ */ new ScrcpyAudioCodec(
        "raw",
        0x00_72_61_77,
        "audio/raw",
        "",
    );

    readonly optionValue: string;
    readonly metadataValue: number;
    readonly mimeType: string;
    readonly webCodecId: string;

    constructor(
        optionValue: string,
        metadataValue: number,
        mimeType: string,
        webCodecId: string,
    ) {
        this.optionValue = optionValue;
        this.metadataValue = metadataValue;
        this.mimeType = mimeType;
        this.webCodecId = webCodecId;
    }

    toOptionValue(): string {
        return this.optionValue;
    }
}

export interface ScrcpyAudioStreamDisabledMetadata {
    readonly type: "disabled";
}

export interface ScrcpyAudioStreamErroredMetadata {
    readonly type: "errored";
}

export interface ScrcpyAudioStreamSuccessMetadata {
    readonly type: "success";
    readonly codec: ScrcpyAudioCodec;
    readonly stream: ReadableStream<Uint8Array>;
}

export type ScrcpyAudioStreamMetadata =
    | ScrcpyAudioStreamDisabledMetadata
    | ScrcpyAudioStreamErroredMetadata
    | ScrcpyAudioStreamSuccessMetadata;
