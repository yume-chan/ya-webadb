import { encodeId } from "./common.js";

export { Data, Done, Lstat, LstatV2, Stat } from "./common.js";

// https://cs.android.com/android/platform/superproject/main/+/main:packages/modules/adb/file_sync_protocol.h;l=23;drc=888a54dcbf954fdffacc8283a793290abcc589cd

export const List = encodeId("LIST");
export const ListV2 = encodeId("LIS2");

export const Send = encodeId("SEND");
export const SendV2 = encodeId("SND2");
export const Receive = encodeId("RECV");
