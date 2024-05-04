import type { ReadableStream } from "@yume-chan/stream-extra";
import { ScrcpyOptions1_21 } from "./1_21.js";
import { ScrcpyOptions2_0, omit } from "./2_0.js";
import { ScrcpyOptions2_2, type ScrcpyOptionsInit2_2 } from "./2_2.js";
import { ScrcpyOptionsBase } from "./types.js";
import type { ValueOrPromise } from "@yume-chan/struct";
import { ScrcpyAudioCodec, type ScrcpyAudioStreamMetadata } from "./codec.js";

export interface ScrcpyOptionsInit2_3
    extends Omit<ScrcpyOptionsInit2_2, "audioCodec"> {
    audioCodec?: "raw" | "opus" | "aac" | "flac";
}

export class ScrcpyOptions2_3 extends ScrcpyOptionsBase<
    ScrcpyOptionsInit2_3,
    ScrcpyOptions2_2
> {
    static readonly DEFAULTS = {
        ...ScrcpyOptions2_2.DEFAULTS,
    } as const satisfies Required<ScrcpyOptionsInit2_3>;

    override get defaults(): Required<ScrcpyOptionsInit2_3> {
        return ScrcpyOptions2_3.DEFAULTS;
    }

    constructor(init: ScrcpyOptionsInit2_3) {
        super(new ScrcpyOptions2_2(omit(init, ["audioCodec"])), {
            ...ScrcpyOptions2_3.DEFAULTS,
            ...init,
        });
    }

    override serialize(): string[] {
        return ScrcpyOptions1_21.serialize(this.value, this.defaults);
    }

    override parseAudioStreamMetadata(
        stream: ReadableStream<Uint8Array>,
    ): ValueOrPromise<ScrcpyAudioStreamMetadata> {
        return ScrcpyOptions2_0.parseAudioMetadata(
            stream,
            this.value.sendCodecMeta,
            (value) => {
                switch (value) {
                    case ScrcpyAudioCodec.RAW.metadataValue:
                        return ScrcpyAudioCodec.RAW;
                    case ScrcpyAudioCodec.OPUS.metadataValue:
                        return ScrcpyAudioCodec.OPUS;
                    case ScrcpyAudioCodec.AAC.metadataValue:
                        return ScrcpyAudioCodec.AAC;
                    case ScrcpyAudioCodec.FLAC.metadataValue:
                        return ScrcpyAudioCodec.FLAC;
                    default:
                        throw new Error(
                            `Unknown audio codec metadata value: ${value}`,
                        );
                }
            },
            () => {
                switch (this.value.audioCodec) {
                    case "raw":
                        return ScrcpyAudioCodec.RAW;
                    case "opus":
                        return ScrcpyAudioCodec.OPUS;
                    case "aac":
                        return ScrcpyAudioCodec.AAC;
                    case "flac":
                        return ScrcpyAudioCodec.FLAC;
                }
            },
        );
    }
}
