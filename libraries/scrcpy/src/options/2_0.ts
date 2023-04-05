import type { ReadableStream } from "@yume-chan/stream-extra";
import {
    BufferedReadableStream,
    PushReadableStream,
} from "@yume-chan/stream-extra";
import type { ValueOrPromise } from "@yume-chan/struct";
import Struct, { NumberFieldType, placeholder } from "@yume-chan/struct";

import type {
    AndroidMotionEventAction,
    ScrcpyInjectTouchControlMessage,
} from "../control/index.js";

import {
    CodecOptions,
    ScrcpyFloatToUint16FieldDefinition,
    ScrcpyOptions1_16,
} from "./1_16/index.js";
import { ScrcpyOptions1_21 } from "./1_21.js";
import type { ScrcpyOptionsInit1_24 } from "./1_24.js";
import { SCRCPY_OPTIONS_DEFAULT_1_24 } from "./1_24.js";
import { ScrcpyOptions1_25 } from "./1_25/index.js";
import type {
    ScrcpyAudioStreamMetadata,
    ScrcpyVideoStream,
    ScrcpyVideoStreamMetadata,
} from "./codec.js";
import { ScrcpyAudioCodec } from "./codec.js";
import type { ScrcpyOptionValue } from "./types.js";
import { ScrcpyOptionsBase } from "./types.js";

export const ScrcpyInjectTouchControlMessage2_0 = new Struct()
    .uint8("type")
    .uint8("action", placeholder<AndroidMotionEventAction>())
    .uint64("pointerId")
    .uint32("pointerX")
    .uint32("pointerY")
    .uint16("screenWidth")
    .uint16("screenHeight")
    .field("pressure", ScrcpyFloatToUint16FieldDefinition)
    .uint32("actionButton")
    .uint32("buttons");

export type ScrcpyInjectTouchControlMessage2_0 =
    (typeof ScrcpyInjectTouchControlMessage2_0)["TInit"];

export class ScrcpyInstanceId implements ScrcpyOptionValue {
    public static readonly NONE = new ScrcpyInstanceId(-1);

    public static random(): ScrcpyInstanceId {
        // A random 31-bit unsigned integer
        return new ScrcpyInstanceId((Math.random() * 0x80000000) | 0);
    }

    public value: number;

    public constructor(value: number) {
        this.value = value;
    }

    public toOptionValue(): string | undefined {
        if (this.value < 0) {
            return undefined;
        }
        return this.value.toString(16);
    }
}

export interface ScrcpyOptionsInit2_0
    extends Omit<
        ScrcpyOptionsInit1_24,
        "bitRate" | "codecOptions" | "encoderName"
    > {
    scid?: ScrcpyInstanceId;

    videoCodec?: "h264" | "h265" | "av1";
    videoBitRate?: number;
    videoCodecOptions?: CodecOptions;
    videoEncoder?: string;

    audio?: boolean;
    audioCodec?: "opus" | "aac" | "raw";
    audioBitRate?: number;
    audioCodecOptions?: CodecOptions;
    audioEncoder?: string;

    listEncoders?: boolean;
    listDisplay?: boolean;
    sendCodecMeta?: boolean;
}

function omit<T extends object, K extends keyof T>(
    obj: T,
    keys: K[]
): Omit<T, K> {
    const result: Record<PropertyKey, unknown> = {};
    for (const key in obj) {
        if (!keys.includes(key as keyof T as K)) {
            result[key] = obj[key];
        }
    }
    return result as Omit<T, K>;
}

export const SCRCPY_OPTIONS_DEFAULT_2_0 = {
    ...omit(SCRCPY_OPTIONS_DEFAULT_1_24, [
        "bitRate",
        "codecOptions",
        "encoderName",
    ]),
    scid: ScrcpyInstanceId.NONE,

    videoCodec: "h264",
    videoBitRate: 8000000,
    videoCodecOptions: new CodecOptions(),
    videoEncoder: "",

    audio: true,
    audioCodec: "opus",
    audioBitRate: 128000,
    audioCodecOptions: new CodecOptions(),
    audioEncoder: "",

    listEncoders: false,
    listDisplay: false,
    sendCodecMeta: true,
} as const satisfies Required<ScrcpyOptionsInit2_0>;

export class ScrcpyOptions2_0 extends ScrcpyOptionsBase<
    ScrcpyOptionsInit2_0,
    ScrcpyOptions1_25
> {
    public constructor(init: ScrcpyOptionsInit2_0) {
        super(new ScrcpyOptions1_25(init), {
            ...SCRCPY_OPTIONS_DEFAULT_2_0,
            ...init,
        });
    }

    public override get defaults(): Required<ScrcpyOptionsInit2_0> {
        return SCRCPY_OPTIONS_DEFAULT_2_0;
    }

    public override serialize(): string[] {
        return ScrcpyOptions1_21.serialize(this.value, this.defaults);
    }

    public override parseVideoStreamMetadata(
        stream: ReadableStream<Uint8Array>
    ): ValueOrPromise<ScrcpyVideoStream> {
        const { sendDeviceMeta, sendCodecMeta } = this.value;
        if (!sendDeviceMeta && !sendCodecMeta) {
            return { stream, metadata: {} };
        }

        return (async () => {
            const buffered = new BufferedReadableStream(stream);
            const metadata: ScrcpyVideoStreamMetadata = {};
            // `sendDeviceMeta` now only contains device name,
            // can't use `super.parseVideoStreamMetadata` here
            if (sendDeviceMeta) {
                metadata.deviceName = await ScrcpyOptions1_16.parseCString(
                    buffered,
                    64
                );
            }
            if (sendCodecMeta) {
                metadata.codec = await ScrcpyOptions1_16.parseUint32BE(
                    buffered
                );
                metadata.width = await ScrcpyOptions1_16.parseUint32BE(
                    buffered
                );
                metadata.height = await ScrcpyOptions1_16.parseUint32BE(
                    buffered
                );
            }
            return { stream: buffered.release(), metadata };
        })();
    }

    public override parseAudioStreamMetadata(
        stream: ReadableStream<Uint8Array>
    ): ValueOrPromise<ScrcpyAudioStreamMetadata> {
        return (async (): Promise<ScrcpyAudioStreamMetadata> => {
            const buffered = new BufferedReadableStream(stream);
            const buffer = await buffered.readExactly(
                NumberFieldType.Uint32.size
            );

            const codecMetadataValue = NumberFieldType.Uint32.deserialize(
                buffer,
                false
            );
            // Server will send `0x00_00_00_00` and `0x00_00_00_01` even if `sendCodecMeta` is false
            switch (codecMetadataValue) {
                case 0x00_00_00_00:
                    return {
                        type: "disabled",
                    };
                case 0x00_00_00_01:
                    return {
                        type: "errored",
                    };
            }

            if (this.value.sendCodecMeta) {
                let codec: ScrcpyAudioCodec;
                switch (codecMetadataValue) {
                    case ScrcpyAudioCodec.OPUS.metadataValue:
                        codec = ScrcpyAudioCodec.OPUS;
                        break;
                    case ScrcpyAudioCodec.AAC.metadataValue:
                        codec = ScrcpyAudioCodec.AAC;
                        break;
                    case ScrcpyAudioCodec.RAW.metadataValue:
                        codec = ScrcpyAudioCodec.RAW;
                        break;
                    default:
                        throw new Error(
                            `Unknown audio codec metadata value: ${codecMetadataValue}`
                        );
                }
                return {
                    type: "success",
                    codec,
                    stream: buffered.release(),
                };
            }

            // Infer codec from `audioCodec` option
            let codec: ScrcpyAudioCodec;
            switch (this.value.audioCodec) {
                case "opus":
                    codec = ScrcpyAudioCodec.OPUS;
                    break;
                case "aac":
                    codec = ScrcpyAudioCodec.AAC;
                    break;
                case "raw":
                    codec = ScrcpyAudioCodec.RAW;
                    break;
            }
            return {
                type: "success",
                codec,
                stream: new PushReadableStream<Uint8Array>(
                    async (controller) => {
                        // Put the first 4 bytes back
                        await controller.enqueue(buffer);

                        const stream = buffered.release();
                        const reader = stream.getReader();
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) {
                                break;
                            }
                            await controller.enqueue(value);
                        }
                    }
                ),
            };
        })();
    }

    public override serializeInjectTouchControlMessage(
        message: ScrcpyInjectTouchControlMessage
    ): Uint8Array {
        return ScrcpyInjectTouchControlMessage2_0.serialize(message);
    }
}
