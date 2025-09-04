import { adbSyncEncodeId } from "./id-common.js";

export { Data, Done, Lstat, LstatV2, Stat } from "./id-common.js";

// https://cs.android.com/android/platform/superproject/main/+/main:packages/modules/adb/file_sync_protocol.h;l=23;drc=888a54dcbf954fdffacc8283a793290abcc589cd

export const List = adbSyncEncodeId("LIST");
export const ListV2 = adbSyncEncodeId("LIS2");

export const Send = adbSyncEncodeId("SEND");
export const SendV2 = adbSyncEncodeId("SND2");
export const Receive = adbSyncEncodeId("RECV");
