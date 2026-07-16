import type { PrevImpl } from "./prev.js";

export interface Init extends PrevImpl.Init {
    videoSource?: "display" | "camera" | undefined;
    cameraId?: string | undefined;
    cameraSize?: string | undefined;
    cameraFacing?: "front" | "back" | "external" | undefined;
    cameraAr?: string | undefined;
    cameraFps?: number | undefined;
    cameraHighSpeed?: boolean | undefined;

    listCameras?: boolean | undefined;
    listCameraSizes?: boolean | undefined;
}
