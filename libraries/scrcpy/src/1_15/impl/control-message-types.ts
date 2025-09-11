import type { ScrcpyControlMessageTypeMap } from "../../base/index.js";
import { ScrcpyControlMessageType } from "../../base/index.js";

export const ControlMessageTypes = {
    [ScrcpyControlMessageType.InjectKeyCode]: 0,
    [ScrcpyControlMessageType.InjectText]: 1,
    [ScrcpyControlMessageType.InjectTouch]: 2,
    [ScrcpyControlMessageType.InjectScroll]: 3,
    [ScrcpyControlMessageType.BackOrScreenOn]: 4,
    [ScrcpyControlMessageType.ExpandNotificationPanel]: 5,
    [ScrcpyControlMessageType.CollapseNotificationPanel]: 6,
    [ScrcpyControlMessageType.GetClipboard]: 7,
    [ScrcpyControlMessageType.SetClipboard]: 8,
    [ScrcpyControlMessageType.SetDisplayPower]: 9,
    [ScrcpyControlMessageType.RotateDevice]: 10,
} as const satisfies ScrcpyControlMessageTypeMap;
