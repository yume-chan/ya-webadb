import type { StructInit } from "@yume-chan/struct";
import { buffer, string, struct, u16, u32, u64, u8 } from "@yume-chan/struct";

import type { AndroidMotionEventAction } from "../../control/index.js";
import {
    EmptyControlMessage,
    ScrcpyControlMessageType,
} from "../../control/index.js";

import { ScrcpyUnsignedFloat } from "./float.js";

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

export const ScrcpyMediaStreamRawPacket = struct(
    { pts: u64, data: buffer(u32) },
    { littleEndian: false },
);

export const SCRCPY_MEDIA_PACKET_FLAG_CONFIG = 1n << 63n;

export const ScrcpyInjectTouchControlMessage1_16 = struct(
    {
        type: u8,
        action: u8<AndroidMotionEventAction>(),
        pointerId: u64,
        pointerX: u32,
        pointerY: u32,
        screenWidth: u16,
        screenHeight: u16,
        pressure: ScrcpyUnsignedFloat,
        buttons: u32,
    },
    { littleEndian: false },
);

export type ScrcpyInjectTouchControlMessage1_16 = StructInit<
    typeof ScrcpyInjectTouchControlMessage1_16
>;

export const ScrcpyBackOrScreenOnControlMessage1_16 = EmptyControlMessage;

export const ScrcpySetClipboardControlMessage1_15 = struct(
    { type: u8, content: string(u32) },
    { littleEndian: false },
);

export type ScrcpySetClipboardControlMessage1_15 = StructInit<
    typeof ScrcpySetClipboardControlMessage1_15
>;

export const ScrcpyClipboardDeviceMessage = struct(
    { content: string(u32) },
    { littleEndian: false },
);
