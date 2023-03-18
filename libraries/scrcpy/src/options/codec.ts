import type { ReadableStream } from "@yume-chan/stream-extra";

export enum ScrcpyVideoCodecId {
    H264 = 0x68_32_36_34,
    H265 = 0x68_32_36_35,
    AV1 = 0x00_61_76_31,
}

export interface ScrcpyVideoStreamMetadata {
    deviceName?: string;
    width?: number;
    height?: number;
    codec?: ScrcpyVideoCodecId;
}

export interface ScrcpyVideoStream {
    readonly stream: ReadableStream<Uint8Array>;
    readonly metadata: ScrcpyVideoStreamMetadata;
}

export enum ScrcpyAudioCodecId {
    Opus = 0x6f_70_75_73,
    Aac = 0x00_61_61_63,
    Raw = 0x00_72_61_77,
    Disabled = 0x00_00_00_00,
    Errored = 0x00_00_00_01,
}

export interface ScrcpyAudioStreamMetadata {
    codec?: ScrcpyAudioCodecId;
}

export interface ScrcpyAudioStream {
    readonly stream: ReadableStream<Uint8Array>;
    readonly metadata: ScrcpyAudioStreamMetadata;
}

export interface ScrcpyMediaStreamConfigurationPacket {
    type: "configuration";
    data: Uint8Array;
}

export interface ScrcpyMediaStreamDataPacket {
    type: "data";
    keyframe?: boolean;
    pts?: bigint;
    data: Uint8Array;
}

export type ScrcpyMediaStreamPacket =
    | ScrcpyMediaStreamConfigurationPacket
    | ScrcpyMediaStreamDataPacket;
