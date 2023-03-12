import { BasicControlMessage } from "./basic.js";

export const ScrcpyRotateDeviceControlMessage = BasicControlMessage;

export type ScrcpyRotateDeviceControlMessage =
    (typeof ScrcpyRotateDeviceControlMessage)["TInit"];
