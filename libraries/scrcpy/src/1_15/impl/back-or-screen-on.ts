import type { StructInit } from "@yume-chan/struct";

import { AndroidKeyEventAction } from "../../android/index.js";
import { EmptyControlMessage } from "../../control/index.js";
import type { ScrcpyBackOrScreenOnControlMessage } from "../../latest.js";

export const BackOrScreenOnControlMessage = EmptyControlMessage;

export type BackOrScreenOnControlMessage = StructInit<
    typeof BackOrScreenOnControlMessage
>;

export function serializeBackOrScreenOnControlMessage(
    message: ScrcpyBackOrScreenOnControlMessage,
) {
    if (message.action === AndroidKeyEventAction.Down) {
        return BackOrScreenOnControlMessage.serialize(message);
    }

    return undefined;
}
