import type { ReadableStream } from "@yume-chan/stream-extra";

import type { ScrcpyVideoStream } from "../../base/video.js";
import { ScrcpyVideoCodecId } from "../../base/video.js";

import type { Init } from "./init.js";
import { PrevImpl } from "./prev.js";

export async function parseVideoStreamMetadata(
    options: Pick<Init, "sendDeviceMeta">,
    stream: ReadableStream<Uint8Array>,
): Promise<ScrcpyVideoStream> {
    if (!options.sendDeviceMeta) {
        return { stream, metadata: { codec: ScrcpyVideoCodecId.H264 } };
    } else {
        return PrevImpl.parseVideoStreamMetadata(stream);
    }
}
