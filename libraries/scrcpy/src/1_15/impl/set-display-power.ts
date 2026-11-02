import type { StructInit } from "@yume-chan/struct";
import { struct, u8 } from "@yume-chan/struct";

import { AndroidScreenPowerMode } from "../../android/index.js";
import type { ScrcpySetDisplayPowerControlMessage } from "../../latest.js";

export const SetDisplayPowerControlMessage = struct(
    {
        // value of `type` can change between versions
        type: u8,
        mode: u8<AndroidScreenPowerMode>(),
    },
    { littleEndian: false },
);

export type SetDisplayPowerControlMessage = StructInit<
    typeof SetDisplayPowerControlMessage
>;

export function serializeSetDisplayPowerControlMessage(
    message: ScrcpySetDisplayPowerControlMessage,
) {
    return SetDisplayPowerControlMessage.serialize({
        type: message.type,
        mode: message.on
            ? AndroidScreenPowerMode.Normal
            : AndroidScreenPowerMode.Off,
    });
}
