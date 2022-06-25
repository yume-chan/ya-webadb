// https://github.com/Genymobile/scrcpy/blob/fa5b2a29e983a46b49531def9cf3d80c40c3de37/app/src/control_msg.h#L23
// For their message bodies, see https://github.com/Genymobile/scrcpy/blob/5c62f3419d252d10cd8c9cbb7c918b358b81f2d0/app/src/control_msg.c#L92
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
