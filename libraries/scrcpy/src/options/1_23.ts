import { TransformStream } from "@yume-chan/stream-extra";

import { ScrcpyOptions1_21 } from "./1_21.js";
import type { ScrcpyOptionsInit1_22 } from "./1_22/index.js";
import {
    SCRCPY_OPTIONS_DEFAULT_1_22,
    ScrcpyOptions1_22,
} from "./1_22/index.js";
import type { ScrcpyVideoStreamPacket } from "./types.js";
import { ScrcpyOptionsBase } from "./types.js";

export interface ScrcpyOptionsInit1_23 extends ScrcpyOptionsInit1_22 {
    cleanup?: boolean;
}

export const SCRCPY_OPTIONS_DEFAULT_1_23 = {
    ...SCRCPY_OPTIONS_DEFAULT_1_22,
    cleanup: true,
} as const satisfies Required<ScrcpyOptionsInit1_23>;

const KEYFRAME_PTS = BigInt(1) << BigInt(62);

export class ScrcpyOptions1_23 extends ScrcpyOptionsBase<
    ScrcpyOptionsInit1_23,
    ScrcpyOptions1_22
> {
    public constructor(init: ScrcpyOptionsInit1_22) {
        super(new ScrcpyOptions1_22(init), {
            ...SCRCPY_OPTIONS_DEFAULT_1_23,
            ...init,
        });
    }

    public override getDefaults(): Required<ScrcpyOptionsInit1_23> {
        return SCRCPY_OPTIONS_DEFAULT_1_23;
    }

    public override serialize(): string[] {
        return ScrcpyOptions1_21.serialize(this.value, this.getDefaults());
    }

    public override createVideoStreamTransformer(): TransformStream<
        Uint8Array,
        ScrcpyVideoStreamPacket
    > {
        const baseStream = this._base.createVideoStreamTransformer();
        return {
            writable: baseStream.writable,
            readable: baseStream.readable.pipeThrough(
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
