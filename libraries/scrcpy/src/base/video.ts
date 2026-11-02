import type { ReadableStream } from "@yume-chan/stream-extra";

import type { ScrcpyVideoCodecId } from "../video/index.js";

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
