import type { ReadableStream } from "@yume-chan/stream-extra";
import { BufferedReadableStream } from "@yume-chan/stream-extra";

import type {
    ScrcpyVideoCodecId,
    ScrcpyVideoStream,
} from "../../base/video.js";

import type { Init } from "./init.js";
import { PrevImpl } from "./prev.js";

export async function parseVideoStreamMetadataAsync(
    stream: ReadableStream<Uint8Array>,
    sendDeviceMeta: Exclude<Init["sendDeviceMeta"], undefined>,
    sendStreamMeta: Exclude<Init["sendStreamMeta"], undefined>,
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
    if (sendStreamMeta) {
        codec = (await PrevImpl.readU32(buffered)) as ScrcpyVideoCodecId;
    } else {
        codec = fallbackCodec;
    }

    return {
        stream: buffered.release(),
        metadata: { deviceName, codec },
    };
}
