import type { StructInit } from "@yume-chan/struct";
import { struct, u8 } from "@yume-chan/struct";

import type { ScrcpySetDisplayPowerControlMessage } from "../../latest.js";

export const SetDisplayPowerControlMessage = struct(
    {
        // value of `type` can change between versions
        type: u8,
        on: u8<boolean>(),
    },
    { littleEndian: false },
);

export type SetDisplayPowerControlMessage = StructInit<
    typeof SetDisplayPowerControlMessage
>;

export function serializeSetDisplayPowerControlMessage(
    message: ScrcpySetDisplayPowerControlMessage,
) {
    return SetDisplayPowerControlMessage.serialize(message);
}
