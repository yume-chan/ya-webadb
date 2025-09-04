import * as AdbFeature from "./features-value.js";

// enum
type AdbFeature = (typeof AdbFeature)[keyof typeof AdbFeature];

export { AdbFeature };

// https://android.googlesource.com/platform/packages/modules/adb/+/79010dc6d5ca7490c493df800d4421730f5466ca/transport.cpp#1252
// There are some other feature constants, but some of them are only used by ADB server, not devices (daemons).
export const AdbDeviceFeatures = [
    AdbFeature.Shell2,
    AdbFeature.Cmd,
    AdbFeature.Stat2,
    AdbFeature.Ls2,
    AdbFeature.FixedPushMkdir,
    AdbFeature.Apex,
    AdbFeature.Abb,
    // only tells the client the symlink timestamp issue in `adb push --sync` has been fixed.
    // No special handling required.
    AdbFeature.FixedPushSymlinkTimestamp,
    AdbFeature.AbbExec,
    AdbFeature.RemountShell,
    AdbFeature.TrackApp,
    AdbFeature.SendReceive2,
    AdbFeature.SendReceive2Brotli,
    AdbFeature.SendReceive2Lz4,
    AdbFeature.SendReceive2Zstd,
    AdbFeature.SendReceive2DryRunSend,
    AdbFeature.DevRaw,
    AdbFeature.AppInfo,
    AdbFeature.DelayedAck,
] as readonly AdbFeature[];
