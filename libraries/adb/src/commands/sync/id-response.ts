import { adbSyncEncodeId } from "./id-common.js";

export { Data, Done, Lstat, LstatV2, Stat } from "./id-common.js";

// https://cs.android.com/android/platform/superproject/main/+/main:packages/modules/adb/file_sync_protocol.h;l=23;drc=888a54dcbf954fdffacc8283a793290abcc589cd

export const Entry = adbSyncEncodeId("DENT");
export const EntryV2 = adbSyncEncodeId("DNT2");

export const Ok = adbSyncEncodeId("OKAY");
export const Fail = adbSyncEncodeId("FAIL");
