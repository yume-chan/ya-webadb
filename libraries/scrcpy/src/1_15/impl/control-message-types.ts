import { ScrcpyControlMessageType } from "../../base/index.js";

export const ControlMessageTypes: readonly ScrcpyControlMessageType[] =
    /* #__PURE__ */ (() => [
        /*  0 */ ScrcpyControlMessageType.InjectKeyCode,
        /*  1 */ ScrcpyControlMessageType.InjectText,
        /*  2 */ ScrcpyControlMessageType.InjectTouch,
        /*  3 */ ScrcpyControlMessageType.InjectScroll,
        /*  4 */ ScrcpyControlMessageType.BackOrScreenOn,
        /*  5 */ ScrcpyControlMessageType.ExpandNotificationPanel,
        /*  6 */ ScrcpyControlMessageType.CollapseNotificationPanel,
        /*  7 */ ScrcpyControlMessageType.GetClipboard,
        /*  8 */ ScrcpyControlMessageType.SetClipboard,
        /*  9 */ ScrcpyControlMessageType.SetDisplayPower,
        /* 10 */ ScrcpyControlMessageType.RotateDevice,
    ])();
