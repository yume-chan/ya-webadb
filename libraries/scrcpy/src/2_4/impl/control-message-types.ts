import type { ScrcpyControlMessageTypeMap } from "../../base/index.js";
import { ScrcpyControlMessageType } from "../../base/index.js";

export const ControlMessageTypes = {
    [ScrcpyControlMessageType.InjectKeyCode]: 0,
    [ScrcpyControlMessageType.InjectText]: 1,
    [ScrcpyControlMessageType.InjectTouch]: 2,
    [ScrcpyControlMessageType.InjectScroll]: 3,
    [ScrcpyControlMessageType.BackOrScreenOn]: 4,
    [ScrcpyControlMessageType.ExpandNotificationPanel]: 5,
    [ScrcpyControlMessageType.ExpandSettingPanel]: 6,
    [ScrcpyControlMessageType.CollapseNotificationPanel]: 7,
    [ScrcpyControlMessageType.GetClipboard]: 8,
    [ScrcpyControlMessageType.SetClipboard]: 9,
    [ScrcpyControlMessageType.SetDisplayPower]: 10,
    [ScrcpyControlMessageType.RotateDevice]: 11,
    [ScrcpyControlMessageType.UHidCreate]: 12,
    [ScrcpyControlMessageType.UHidInput]: 13,
    [ScrcpyControlMessageType.OpenHardKeyboardSettings]: 14,
} as const satisfies ScrcpyControlMessageTypeMap;
