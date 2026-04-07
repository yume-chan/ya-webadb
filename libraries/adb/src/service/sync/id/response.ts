import { encodeId } from "./common.js";

export { Data, Done, Lstat, LstatV2, Stat } from "./common.js";

// https://cs.android.com/android/platform/superproject/main/+/main:packages/modules/adb/file_sync_protocol.h;l=23;drc=888a54dcbf954fdffacc8283a793290abcc589cd

export const Entry = encodeId("DENT");
export const EntryV2 = encodeId("DNT2");

export const Ok = encodeId("OKAY");
export const Fail = encodeId("FAIL");
