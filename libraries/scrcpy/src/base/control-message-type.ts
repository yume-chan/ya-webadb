// Their IDs change between versions, so always use `options.getControlMessageTypes()`
export const ScrcpyControlMessageType = {
    InjectKeyCode: 0,
    InjectText: 1,
    InjectTouch: 2,
    InjectScroll: 3,
    BackOrScreenOn: 4,
    ExpandNotificationPanel: 5,
    ExpandSettingPanel: 6,
    CollapseNotificationPanel: 7,
    GetClipboard: 8,
    SetClipboard: 9,
    SetDisplayPower: 10,
    RotateDevice: 11,
    UHidCreate: 12,
    UHidInput: 13,
    UHidDestroy: 14,
    OpenHardKeyboardSettings: 15,
    StartApp: 16,
    ResetVideo: 17,
} as const;

export type ScrcpyControlMessageType =
    (typeof ScrcpyControlMessageType)[keyof typeof ScrcpyControlMessageType];
