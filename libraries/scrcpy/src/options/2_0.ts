import { getUint32BigEndian } from "@yume-chan/no-data-view";
import type { ReadableStream } from "@yume-chan/stream-extra";
import {
    BufferedReadableStream,
    PushReadableStream,
} from "@yume-chan/stream-extra";
import type { MaybePromiseLike, StructInit } from "@yume-chan/struct";
import { struct, u16, u32, u64, u8 } from "@yume-chan/struct";

import type {
    AndroidMotionEventAction,
    ScrcpyInjectTouchControlMessage,
} from "../control/index.js";

import {
    CodecOptions,
    ScrcpyOptions1_16,
    ScrcpyUnsignedFloat,
} from "./1_16/index.js";
import { ScrcpyOptions1_21 } from "./1_21.js";
import type { ScrcpyOptionsInit1_24 } from "./1_24.js";
import { ScrcpyOptions1_24 } from "./1_24.js";
import { ScrcpyOptions1_25 } from "./1_25/index.js";
import type { ScrcpyAudioStreamMetadata, ScrcpyVideoStream } from "./codec.js";
import { ScrcpyAudioCodec, ScrcpyVideoCodecId } from "./codec.js";
import type {
    ScrcpyDisplay,
    ScrcpyEncoder,
    ScrcpyOptionValue,
} from "./types.js";
import { ScrcpyOptions } from "./types.js";

export const ScrcpyInjectTouchControlMessage2_0 = struct(
    {
        type: u8,
        action: u8.as<AndroidMotionEventAction>(),
        pointerId: u64,
        pointerX: u32,
        pointerY: u32,
        screenWidth: u16,
        screenHeight: u16,
        pressure: ScrcpyUnsignedFloat,
        actionButton: u32,
        buttons: u32,
    },
    { littleEndian: false },
);

export type ScrcpyInjectTouchControlMessage2_0 = StructInit<
    typeof ScrcpyInjectTouchControlMessage2_0
>;

export class ScrcpyInstanceId implements ScrcpyOptionValue {
    static readonly NONE = new ScrcpyInstanceId(-1);

    static random(): ScrcpyInstanceId {
        // A random 31-bit unsigned integer
        return new ScrcpyInstanceId((Math.random() * 0x80000000) | 0);
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

export interface ScrcpyOptionsInit2_0
    extends Omit<
        ScrcpyOptionsInit1_24,
        "bitRate" | "codecOptions" | "encoderName"
    > {
    scid?: ScrcpyInstanceId;

    videoCodec?: "h264" | "h265" | "av1";
    videoBitRate?: number;
    videoCodecOptions?: CodecOptions;
    videoEncoder?: string | undefined;

    audio?: boolean;
    audioCodec?: "raw" | "opus" | "aac";
    audioBitRate?: number;
    audioCodecOptions?: CodecOptions;
    audioEncoder?: string | undefined;

    listEncoders?: boolean;
    listDisplays?: boolean;
    sendCodecMeta?: boolean;
}

export function omit<T extends object, K extends keyof T>(
    obj: T,
    keys: K[],
): Omit<T, K> {
    const result: Record<PropertyKey, unknown> = {};
    for (const key in obj) {
        if (!keys.includes(key as keyof T as K)) {
            result[key] = obj[key];
        }
    }
    return result as Omit<T, K>;
}

export class ScrcpyOptions2_0 extends ScrcpyOptions<ScrcpyOptionsInit2_0> {
    static async parseAudioMetadata(
        stream: ReadableStream<Uint8Array>,
        sendCodecMeta: boolean,
        mapMetadata: (value: number) => ScrcpyAudioCodec,
        getOptionCodec: () => ScrcpyAudioCodec,
    ): Promise<ScrcpyAudioStreamMetadata> {
        const buffered = new BufferedReadableStream(stream);

        const buffer = await buffered.readExactly(4);
        // Treat it as a 32-bit number for simpler comparisons
        const codecMetadataValue = getUint32BigEndian(buffer, 0);
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

        if (sendCodecMeta) {
            return {
                type: "success",
                codec: mapMetadata(codecMetadataValue),
                stream: buffered.release(),
            };
        }

        return {
            type: "success",
            // Infer codec from `audioCodec` option
            codec: getOptionCodec(),
            stream: new PushReadableStream<Uint8Array>(async (controller) => {
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
            }),
        };
    }

    static readonly DEFAULTS = {
        ...omit(ScrcpyOptions1_24.DEFAULTS, [
            "bitRate",
            "codecOptions",
            "encoderName",
        ]),
        scid: ScrcpyInstanceId.NONE,

        videoCodec: "h264",
        videoBitRate: 8000000,
        videoCodecOptions: new CodecOptions(),
        videoEncoder: undefined,

        audio: true,
        audioCodec: "opus",
        audioBitRate: 128000,
        audioCodecOptions: new CodecOptions(),
        audioEncoder: undefined,

        listEncoders: false,
        listDisplays: false,
        sendCodecMeta: true,
    } as const satisfies Required<ScrcpyOptionsInit2_0>;

    override get defaults(): Required<ScrcpyOptionsInit2_0> {
        return ScrcpyOptions2_0.DEFAULTS;
    }

    constructor(init: ScrcpyOptionsInit2_0) {
        super(ScrcpyOptions1_25, init, ScrcpyOptions2_0.DEFAULTS);
    }

    override serialize(): string[] {
        return ScrcpyOptions1_21.serialize(this.value, this.defaults);
    }

    override setListEncoders(): void {
        this.value.listEncoders = true;
    }

    override setListDisplays(): void {
        this.value.listDisplays = true;
    }

    override parseEncoder(line: string): ScrcpyEncoder | undefined {
        let match = line.match(
            /^\s+--video-codec=(\S+)\s+--video-encoder='([^']+)'$/,
        );
        if (match) {
            return {
                type: "video",
                codec: match[1]!,
                name: match[2]!,
            };
        }

        match = line.match(
            /^\s+--audio-codec=(\S+)\s+--audio-encoder='([^']+)'$/,
        );
        if (match) {
            return {
                type: "audio",
                codec: match[1]!,
                name: match[2]!,
            };
        }

        return undefined;
    }

    override parseDisplay(line: string): ScrcpyDisplay | undefined {
        const match = line.match(/^\s+--display=(\d+)\s+\(([^)]+)\)$/);
        if (match) {
            const display: ScrcpyDisplay = {
                id: Number.parseInt(match[1]!, 10),
            };
            if (match[2] !== "size unknown") {
                display.resolution = match[2]!;
            }
            return display;
        }
        return undefined;
    }

    override parseVideoStreamMetadata(
        stream: ReadableStream<Uint8Array>,
    ): MaybePromiseLike<ScrcpyVideoStream> {
        const { sendDeviceMeta, sendCodecMeta } = this.value;
        if (!sendDeviceMeta && !sendCodecMeta) {
            let codec: ScrcpyVideoCodecId;
            switch (this.value.videoCodec) {
                case "h264":
                    codec = ScrcpyVideoCodecId.H264;
                    break;
                case "h265":
                    codec = ScrcpyVideoCodecId.H265;
                    break;
                case "av1":
                    codec = ScrcpyVideoCodecId.AV1;
                    break;
            }
            return { stream, metadata: { codec } };
        }

        return (async () => {
            const buffered = new BufferedReadableStream(stream);

            // `sendDeviceMeta` now only contains device name,
            // can't use `super.parseVideoStreamMetadata` here
            let deviceName: string | undefined;
            if (sendDeviceMeta) {
                deviceName = await ScrcpyOptions1_16.parseCString(buffered, 64);
            }

            let codec: ScrcpyVideoCodecId;
            let width: number | undefined;
            let height: number | undefined;
            if (sendCodecMeta) {
                codec = await ScrcpyOptions1_16.parseUint32BE(buffered);
                width = await ScrcpyOptions1_16.parseUint32BE(buffered);
                height = await ScrcpyOptions1_16.parseUint32BE(buffered);
            } else {
                switch (this.value.videoCodec) {
                    case "h264":
                        codec = ScrcpyVideoCodecId.H264;
                        break;
                    case "h265":
                        codec = ScrcpyVideoCodecId.H265;
                        break;
                    case "av1":
                        codec = ScrcpyVideoCodecId.AV1;
                        break;
                }
            }

            return {
                stream: buffered.release(),
                metadata: { deviceName, codec, width, height },
            };
        })();
    }

    override parseAudioStreamMetadata(
        stream: ReadableStream<Uint8Array>,
    ): MaybePromiseLike<ScrcpyAudioStreamMetadata> {
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
                }
            },
        );
    }

    override serializeInjectTouchControlMessage(
        message: ScrcpyInjectTouchControlMessage,
    ): Uint8Array {
        return ScrcpyInjectTouchControlMessage2_0.serialize(message);
    }
}
