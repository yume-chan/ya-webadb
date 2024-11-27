import type { PrevImpl } from "./prev.js";

export interface Init extends PrevImpl.Init {
    videoSource?: "display" | "camera";
    cameraId?: string | undefined;
    cameraSize?: string | undefined;
    cameraFacing?: "front" | "back" | "external" | undefined;
    cameraAr?: string | undefined;
    cameraFps?: number | undefined;
    cameraHighSpeed?: boolean;

    listCameras?: boolean;
    listCameraSizes?: boolean;
}
