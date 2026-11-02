import {
    getUint32BigEndian,
    getUint64BigEndian,
} from "@yume-chan/no-data-view";
import {
    BufferedTransformStream,
    TransformStream,
} from "@yume-chan/stream-extra";

import type { ScrcpyVideoStreamPacket } from "../../base/index.js";

import type { Init } from "./init.js";

export function createMediaStreamTransformer(
    options: Pick<Init, "sendFrameMeta">,
): TransformStream<Uint8Array, ScrcpyVideoStreamPacket> {
    // Quick path for raw stream without frame meta
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

    return new BufferedTransformStream<ScrcpyVideoStreamPacket>(
        async (buffered) => {
            const header = await buffered.readExactly(12);
            if (header[0]! & 0x80) {
                return {
                    type: "session",
                    isClientResize: !!(header[0]! & 1),
                    width: getUint32BigEndian(header, 4),
                    height: getUint32BigEndian(header, 8),
                };
            }

            if (header[0]! & 0x40) {
                return {
                    type: "configuration",
                    data: await buffered.readExactly(
                        getUint32BigEndian(header, 8),
                    ),
                };
            }

            return {
                type: "data",
                keyframe: !!(header[0]! & 0x20),
                pts: getUint64BigEndian(header, 0) & 0x1fffffffffffffffn,
                data: await buffered.readExactly(getUint32BigEndian(header, 8)),
            };
        },
    );
}
