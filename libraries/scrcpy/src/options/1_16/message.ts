import Struct, { placeholder } from "@yume-chan/struct";

import type { AndroidMotionEventAction } from "../../control/index.js";
import {
    BasicControlMessage,
    ScrcpyControlMessageType,
} from "../../control/index.js";

import { ScrcpyFloatToUint16FieldDefinition } from "./float-to-uint16.js";

export const SCRCPY_CONTROL_MESSAGE_TYPES_1_16: readonly ScrcpyControlMessageType[] =
    [
        /*  0 */ ScrcpyControlMessageType.InjectKeyCode,
        /*  1 */ ScrcpyControlMessageType.InjectText,
        /*  2 */ ScrcpyControlMessageType.InjectTouch,
        /*  3 */ ScrcpyControlMessageType.InjectScroll,
        /*  4 */ ScrcpyControlMessageType.BackOrScreenOn,
        /*  5 */ ScrcpyControlMessageType.ExpandNotificationPanel,
        /*  6 */ ScrcpyControlMessageType.CollapseNotificationPanel,
        /*  7 */ ScrcpyControlMessageType.GetClipboard,
        /*  8 */ ScrcpyControlMessageType.SetClipboard,
        /*  9 */ ScrcpyControlMessageType.SetScreenPowerMode,
        /* 10 */ ScrcpyControlMessageType.RotateDevice,
    ];

export const ScrcpyMediaStreamRawPacket = new Struct()
    .uint64("pts")
    .uint32("size")
    .uint8Array("data", { lengthField: "size" });

export const SCRCPY_MEDIA_PACKET_FLAG_CONFIG = 1n << 63n;

export const ScrcpyInjectTouchControlMessage1_16 = new Struct()
    .uint8("type")
    .uint8("action", placeholder<AndroidMotionEventAction>())
    .uint64("pointerId")
    .uint32("pointerX")
    .uint32("pointerY")
    .uint16("screenWidth")
    .uint16("screenHeight")
    .field("pressure", ScrcpyFloatToUint16FieldDefinition)
    .uint32("buttons");

export type ScrcpyInjectTouchControlMessage1_16 =
    (typeof ScrcpyInjectTouchControlMessage1_16)["TInit"];

export const ScrcpyBackOrScreenOnControlMessage1_16 = BasicControlMessage;

export const ScrcpySetClipboardControlMessage1_15 = new Struct()
    .uint8("type")
    .uint32("length")
    .string("content", { lengthField: "length" });

export type ScrcpySetClipboardControlMessage1_15 =
    (typeof ScrcpySetClipboardControlMessage1_15)["TInit"];
