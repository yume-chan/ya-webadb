import type { MaybePromiseLike } from "@yume-chan/async";
import type { ReadableStream } from "@yume-chan/stream-extra";
import { BufferedReadableStream } from "@yume-chan/stream-extra";

import type { ScrcpyVideoStream } from "../../base/video.js";
import { ScrcpyVideoCodecId } from "../../base/video.js";

import type { Init } from "./init.js";
import { PrevImpl } from "./prev.js";

function toCodecId(codec: string): ScrcpyVideoCodecId {
    switch (codec) {
        case "h264":
            return ScrcpyVideoCodecId.H264;
        case "h265":
            return ScrcpyVideoCodecId.H265;
        case "av1":
            return ScrcpyVideoCodecId.AV1;
        default:
            throw new Error(`Unknown video codec: ${codec}`);
    }
}

async function parseAsync(
    options: Pick<
        Required<Init>,
        "sendDeviceMeta" | "sendCodecMeta" | "videoCodec"
    >,
    stream: ReadableStream<Uint8Array>,
) {
    const buffered = new BufferedReadableStream(stream);

    // `sendDeviceMeta` now only contains device name,
    // can't use `super.parseVideoStreamMetadata` here
    let deviceName: string | undefined;
    if (options.sendDeviceMeta) {
        deviceName = await PrevImpl.readString(buffered, 64);
    }

    let codec: ScrcpyVideoCodecId;
    let width: number | undefined;
    let height: number | undefined;
    if (options.sendCodecMeta) {
        codec = (await PrevImpl.readU32(buffered)) as ScrcpyVideoCodecId;
        width = await PrevImpl.readU32(buffered);
        height = await PrevImpl.readU32(buffered);
    } else {
        codec = toCodecId(options.videoCodec);
    }

    return {
        stream: buffered.release(),
        metadata: { deviceName, codec, width, height },
    };
}

export function parseVideoStreamMetadata(
    options: Pick<
        Required<Init>,
        "sendDeviceMeta" | "sendCodecMeta" | "videoCodec"
    >,
    stream: ReadableStream<Uint8Array>,
): MaybePromiseLike<ScrcpyVideoStream> {
    if (!options.sendDeviceMeta && !options.sendCodecMeta) {
        return {
            stream,
            metadata: { codec: toCodecId(options.videoCodec) },
        };
    }

    return parseAsync(options, stream);
}
