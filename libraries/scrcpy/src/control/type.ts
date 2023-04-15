// https://github.com/Genymobile/scrcpy/blob/fa5b2a29e983a46b49531def9cf3d80c40c3de37/app/src/control_msg.h#L23
// For their message bodies, see https://github.com/Genymobile/scrcpy/blob/5c62f3419d252d10cd8c9cbb7c918b358b81f2d0/app/src/control_msg.c#L92

import type { ScrcpyOptions } from "../options/index.js";

// Their IDs change between versions, so always use `options.getControlMessageTypes()`
export enum ScrcpyControlMessageType {
    InjectKeyCode,
    InjectText,
    InjectTouch,
    InjectScroll,
    BackOrScreenOn,
    ExpandNotificationPanel,
    ExpandSettingPanel,
    CollapseNotificationPanel,
    GetClipboard,
    SetClipboard,
    SetScreenPowerMode,
    RotateDevice,
}

/**
 * Scrcpy control message types have different values between versions.
 *
 * This class provides a way to get the actual value for a given type.
 */
export class ScrcpyControlMessageTypeValue {
    private types: readonly ScrcpyControlMessageType[];

    public constructor(options: ScrcpyOptions<object>) {
        this.types = options.controlMessageTypes;
    }

    public get(type: ScrcpyControlMessageType): number {
        const value = this.types.indexOf(type);
        if (value === -1) {
            throw new Error("Not supported");
        }
        return value;
    }

    public fillMessageType<T extends { type: ScrcpyControlMessageType }>(
        message: Omit<T, "type">,
        type: T["type"]
    ): T {
        (message as T).type = this.get(type);
        return message as T;
    }
}
