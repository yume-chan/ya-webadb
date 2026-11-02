// cspell: ignore Libusb
// cspell: ignore devraw
// cspell: ignore Openscreen
// cspell: ignore devicetracker

// The order follows
// https://cs.android.com/android/platform/superproject/main/+/main:packages/modules/adb/transport.cpp;l=81;drc=2d3e62c2af54a3e8f8803ea10492e63b8dfe709f

export const Shell2 = "shell_v2";
export const Cmd = "cmd";
export const Stat2 = "stat_v2";
export const Ls2 = "ls_v2";
/**
 * server only
 */
export const Libusb = "libusb";
/**
 * server only
 */
export const PushSync = "push_sync";
export const Apex = "apex";
export const FixedPushMkdir = "fixed_push_mkdir";
export const Abb = "abb";
export const FixedPushSymlinkTimestamp = "fixed_push_symlink_timestamp";
export const AbbExec = "abb_exec";
export const RemountShell = "remount_shell";
export const TrackApp = "track_app";
export const SendReceive2 = "sendrecv_v2";
export const SendReceive2Brotli = "sendrecv_v2_brotli";
export const SendReceive2Lz4 = "sendrecv_v2_lz4";
export const SendReceive2Zstd = "sendrecv_v2_zstd";
export const SendReceive2DryRunSend = "sendrecv_v2_dry_run_send";
export const DelayedAck = "delayed_ack";
/**
 * server only
 */
export const OpenscreenMdns = "openscreen_mdns";
/**
 * server only
 */
export const DeviceTrackerProtoFormat = "devicetracker_proto_format";
export const DevRaw = "devraw";
export const AppInfo = "app_info";
/**
 * server only
 */
export const ServerStatus = "server_status";
