// The order follows
// https://android.googlesource.com/platform/packages/modules/adb/+/79010dc6d5ca7490c493df800d4421730f5466ca/transport.cpp#1252
export enum AdbFeature {
    ShellV2 = "shell_v2",
    Cmd = "cmd",
    StatV2 = "stat_v2",
    ListV2 = "ls_v2",
    FixedPushMkdir = "fixed_push_mkdir",
    Abb = "abb",
    AbbExec = "abb_exec",
    SendReceiveV2 = "sendrecv_v2",
}
