import type { ReadableStream } from "@yume-chan/stream-extra";

export interface ScrcpyVideoStream {
    readonly stream: ReadableStream<Uint8Array>;
    readonly metadata: ScrcpyVideoStreamMetadata;
}

export interface ScrcpyVideoStreamMetadata {
    deviceName?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    codec: ScrcpyVideoCodecId;
}

export const ScrcpyVideoCodecId = {
    H264: 0x68_32_36_34,
    H265: 0x68_32_36_35,
    AV1: 0x00_61_76_31,
};

export type ScrcpyVideoCodecId =
    (typeof ScrcpyVideoCodecId)[keyof typeof ScrcpyVideoCodecId];
