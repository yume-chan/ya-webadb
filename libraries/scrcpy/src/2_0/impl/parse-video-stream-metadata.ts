import type { MaybePromiseLike } from "@yume-chan/async";
import type { ReadableStream } from "@yume-chan/stream-extra";
import { BufferedReadableStream } from "@yume-chan/stream-extra";

import type { ScrcpyVideoStream } from "../../base/video.js";
import { ScrcpyVideoCodecId } from "../../base/video.js";

import type { Init } from "./init.js";
import { PrevImpl } from "./prev.js";

export function parseVideoCodecOption(
    codec: Exclude<Init["videoCodec"], undefined>,
): ScrcpyVideoCodecId {
    switch (codec) {
        case "h264":
            return ScrcpyVideoCodecId.H264;
        case "h265":
            return ScrcpyVideoCodecId.H265;
        case "av1":
            return ScrcpyVideoCodecId.AV1;
        default:
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            throw new Error(`Unknown video codec: ${codec}`);
    }
}

export async function parseVideoStreamMetadataAsync(
    stream: ReadableStream<Uint8Array>,
    sendDeviceMeta: Exclude<Init["sendDeviceMeta"], undefined>,
    sendCodecMeta: Exclude<Init["sendCodecMeta"], undefined>,
    fallbackCodec: ScrcpyVideoCodecId,
): Promise<ScrcpyVideoStream> {
    const buffered = new BufferedReadableStream(stream);

    // `sendDeviceMeta` now only contains device name,
    // can't use `PrevImpl.parseVideoStreamMetadata` here
    let deviceName: string | undefined;
    if (sendDeviceMeta) {
        deviceName = await PrevImpl.readString(buffered, 64);
    }

    let codec: ScrcpyVideoCodecId;
    let width: number | undefined;
    let height: number | undefined;
    if (sendCodecMeta) {
        codec = (await PrevImpl.readU32(buffered)) as ScrcpyVideoCodecId;
        width = await PrevImpl.readU32(buffered);
        height = await PrevImpl.readU32(buffered);
    } else {
        codec = fallbackCodec;
    }

    return {
        stream: buffered.release(),
        metadata: { deviceName, codec, width, height },
    };
}

// eslint-disable-next-line @typescript-eslint/max-params
export function parseVideoStreamMetadata(
    stream: ReadableStream<Uint8Array>,
    sendDeviceMeta: Exclude<Init["sendDeviceMeta"], undefined>,
    sendCodecMeta: Exclude<Init["sendCodecMeta"], undefined>,
    fallbackCodec: ScrcpyVideoCodecId,
    parseAsync: typeof parseVideoStreamMetadataAsync,
): MaybePromiseLike<ScrcpyVideoStream> {
    if (!sendDeviceMeta && !sendCodecMeta) {
        return {
            stream,
            metadata: { codec: fallbackCodec },
        };
    }

    return parseAsync(stream, sendDeviceMeta, sendCodecMeta, fallbackCodec);
}
