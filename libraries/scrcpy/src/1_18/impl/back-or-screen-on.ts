import type { StructInit } from "@yume-chan/struct";
import { struct, u8 } from "@yume-chan/struct";

import type { AndroidKeyEventAction } from "../../android/index.js";
import type { ScrcpyBackOrScreenOnControlMessage } from "../../latest.js";

import { PrevImpl } from "./prev.js";

export const BackOrScreenOnControlMessage = /* #__PURE__ */ (() =>
    struct(
        {
            ...PrevImpl.BackOrScreenOnControlMessage.fields,
            action: u8<AndroidKeyEventAction>(),
        },
        { littleEndian: false },
    ))();

export type BackOrScreenOnControlMessage = StructInit<
    typeof BackOrScreenOnControlMessage
>;

export function serializeBackOrScreenOnControlMessage(
    message: ScrcpyBackOrScreenOnControlMessage,
) {
    return BackOrScreenOnControlMessage.serialize(message);
}
