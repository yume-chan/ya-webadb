import { TransformStream } from "@yume-chan/stream-extra";

import { ScrcpyOptions1_21 } from "./1_21.js";
import type { ScrcpyOptionsInit1_22 } from "./1_22/index.js";
import { ScrcpyOptions1_22 } from "./1_22/index.js";
import type { ScrcpyMediaStreamPacket } from "./codec.js";
import { ScrcpyOptions } from "./types.js";

export interface ScrcpyOptionsInit1_23 extends ScrcpyOptionsInit1_22 {
    cleanup?: boolean;
}

const KEYFRAME_PTS = 1n << 62n;

export class ScrcpyOptions1_23 extends ScrcpyOptions<ScrcpyOptionsInit1_23> {
    static readonly DEFAULTS = {
        ...ScrcpyOptions1_22.DEFAULTS,
        cleanup: true,
    } as const satisfies Required<ScrcpyOptionsInit1_23>;

    override get defaults(): Required<ScrcpyOptionsInit1_23> {
        return ScrcpyOptions1_23.DEFAULTS;
    }

    constructor(init: ScrcpyOptionsInit1_22) {
        super(ScrcpyOptions1_22, init, ScrcpyOptions1_23.DEFAULTS);
    }

    override serialize(): string[] {
        return ScrcpyOptions1_21.serialize(this.value, this.defaults);
    }

    override createMediaStreamTransformer(): TransformStream<
        Uint8Array,
        ScrcpyMediaStreamPacket
    > {
        const stream = super.createMediaStreamTransformer();
        return {
            writable: stream.writable,
            readable: stream.readable.pipeThrough(
                new TransformStream({
                    transform(packet, controller): void {
                        if (packet.type !== "data") {
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
                }),
            ),
        };
    }
}
