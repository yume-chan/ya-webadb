// The order follows
// https://cs.android.com/android/platform/superproject/+/master:packages/modules/adb/transport.cpp;l=77;drc=6d14d35d0241f6fee145f8e54ffd77252e8d29fd
export const AdbFeature = {
    ShellV2: "shell_v2",
    Cmd: "cmd",
    StatV2: "stat_v2",
    ListV2: "ls_v2",
    FixedPushMkdir: "fixed_push_mkdir",
    Abb: "abb",
    AbbExec: "abb_exec",
    SendReceiveV2: "sendrecv_v2",
    DelayedAck: "delayed_ack",
} as const;

export type AdbFeature = (typeof AdbFeature)[keyof typeof AdbFeature];
