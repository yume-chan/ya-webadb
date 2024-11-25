import {
    StructDeserializeStream,
    TransformStream,
} from "@yume-chan/stream-extra";
import { buffer, struct, u32, u64 } from "@yume-chan/struct";

import type { ScrcpyMediaStreamPacket } from "../../base/index.js";

import type { Init } from "./init.js";

export const MediaStreamRawPacket = struct(
    { pts: u64, data: buffer(u32) },
    { littleEndian: false },
);

export const PtsConfig = 1n << 63n;

export function createMediaStreamTransformer(
    options: Pick<Init, "sendFrameMeta">,
): TransformStream<Uint8Array, ScrcpyMediaStreamPacket> {
    // Optimized path for video frames only
    if (!options.sendFrameMeta) {
        return new TransformStream({
            transform(chunk, controller) {
                controller.enqueue({
                    type: "data",
                    data: chunk,
                });
            },
        });
    }

    const deserializeStream = new StructDeserializeStream(MediaStreamRawPacket);
    return {
        writable: deserializeStream.writable,
        readable: deserializeStream.readable.pipeThrough(
            new TransformStream({
                transform(packet, controller) {
                    if (packet.pts === PtsConfig) {
                        controller.enqueue({
                            type: "configuration",
                            data: packet.data,
                        });
                        return;
                    }

                    controller.enqueue({
                        type: "data",
                        pts: packet.pts,
                        data: packet.data,
                    });
                },
            }),
        ),
    };
}
