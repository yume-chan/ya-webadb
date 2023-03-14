import type { ReadableStream } from "@yume-chan/stream-extra";
import { BufferedReadableStream } from "@yume-chan/stream-extra";
import type { ValueOrPromise } from "@yume-chan/struct";
import Struct, { placeholder } from "@yume-chan/struct";

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
import type { ScrcpyOptionValue, ScrcpyVideoStreamMetadata } from "./types.js";
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
    audio?: boolean;
    videoCodec?: "h264" | "h265" | "av1";
    audioCodec?: "opus" | "aac" | "raw";
    videoBitRate?: number;
    audioBitRate?: number;
    videoCodecOptions?: CodecOptions;
    audioCodecOptions?: CodecOptions;
    videoEncoder?: string;
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
    audio: true,
    videoCodec: "h264",
    audioCodec: "opus",
    videoBitRate: 8000000,
    audioBitRate: 128000,
    videoCodecOptions: new CodecOptions(),
    audioCodecOptions: new CodecOptions(),
    videoEncoder: "",
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
    ): ValueOrPromise<[ReadableStream<Uint8Array>, ScrcpyVideoStreamMetadata]> {
        const { sendDeviceMeta, sendCodecMeta } = this.value;
        if (!sendDeviceMeta && !sendCodecMeta) {
            return [stream, {}];
        } else {
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
                return [buffered.release(), metadata];
            })();
        }
    }

    public override serializeInjectTouchControlMessage(
        message: ScrcpyInjectTouchControlMessage
    ): Uint8Array {
        return ScrcpyInjectTouchControlMessage2_0.serialize(message);
    }
}
