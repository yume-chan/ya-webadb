import { TransformStream } from "@yume-chan/stream-extra";

import type { ScrcpyOptionsInit1_22 } from "./1_22/options.js";
import { ScrcpyOptions1_22 } from "./1_22/options.js";
import type { ScrcpyVideoStreamPacket } from "./types.js";

export interface ScrcpyOptionsInit1_23 extends ScrcpyOptionsInit1_22 {
    cleanup: boolean;
}

const KEYFRAME_PTS = BigInt(1) << BigInt(62);

export class ScrcpyOptions1_23<
    T extends ScrcpyOptionsInit1_23 = ScrcpyOptionsInit1_23
> extends ScrcpyOptions1_22<T> {
    public constructor(init: Partial<ScrcpyOptionsInit1_23>) {
        super(init);
    }

    public override getDefaultValue(): T {
        return {
            ...super.getDefaultValue(),
            cleanup: true,
        };
    }

    public override createVideoStreamTransformer(): TransformStream<
        Uint8Array,
        ScrcpyVideoStreamPacket
    > {
        const superStream = super.createVideoStreamTransformer();
        return {
            writable: superStream.writable,
            readable: superStream.readable.pipeThrough(
                new TransformStream({
                    transform(packet, controller): void {
                        if (packet.type !== "frame") {
                            controller.enqueue(packet);
                            return;
                        }

                        if (
                            packet.pts !== undefined &&
                            packet.pts & KEYFRAME_PTS
                        ) {
                            packet.keyframe = true;
                            packet.pts &= ~KEYFRAME_PTS;
                        }

                        controller.enqueue(packet);
                    },
                })
            ),
        };
    }
}
