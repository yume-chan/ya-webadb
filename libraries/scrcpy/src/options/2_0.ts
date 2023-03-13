// cspell:ignore scid

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
} from "./1_16/index.js";
import type { ScrcpyOptionsInit1_24 } from "./1_24.js";
import { ScrcpyOptions1_25 } from "./1_25/index.js";
import type { ScrcpyOptionValue, ScrcpyVideoStreamMetadata } from "./types.js";

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

export interface ScrcpyOptionsInit2_0 extends ScrcpyOptionsInit1_24 {
    scid?: ScrcpyInstanceId;
    audio?: boolean;
    videoCodec?: "h264" | "h265" | "av1";
    audioCodec?: "opus" | "aac" | "raw";
    /**
     * @deprecated Use `videoBitRate` instead
     */
    bitRate?: number;
    videoBitRate?: number;
    audioBitRate?: number;
    /**
     * @deprecated Use `videoCodecOptions` instead
     */
    codecOptions?: CodecOptions;
    videoCodecOptions?: CodecOptions;
    audioCodecOptions?: CodecOptions;
    /**
     * @deprecated Use `videoEncoder` instead
     */
    encoderName?: string;
    videoEncoder?: string;
    audioEncoder?: string;
    listEncoders?: boolean;
    listDisplay?: boolean;
    sendCodecMeta?: boolean;
}

export class ScrcpyOptions2_0<
    T extends ScrcpyOptionsInit2_0 = ScrcpyOptionsInit2_0
> extends ScrcpyOptions1_25<T> {
    public constructor(init: ScrcpyOptionsInit2_0) {
        if (!init.videoBitRate && init.bitRate) {
            init.videoBitRate = init.bitRate;
            delete init.bitRate;
        }

        if (!init.videoCodecOptions && init.codecOptions) {
            init.videoCodecOptions = init.codecOptions;
            delete init.codecOptions;
        }

        if (!init.videoEncoder && init.encoderName) {
            init.videoEncoder = init.encoderName;
            delete init.encoderName;
        }

        if (!init.rawVideoStream) {
            init.sendCodecMeta = false;
        }

        super(init);
    }

    public override getDefaultValues(): Required<T> {
        return Object.assign(super.getDefaultValues(), {
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
        } satisfies Omit<ScrcpyOptionsInit2_0, keyof ScrcpyOptionsInit1_24>);
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
                    metadata.deviceName = await this.parseCString(buffered);
                }
                if (sendCodecMeta) {
                    metadata.codec = await this.parseUint32BE(buffered);
                    metadata.width = await this.parseUint32BE(buffered);
                    metadata.height = await this.parseUint32BE(buffered);
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
