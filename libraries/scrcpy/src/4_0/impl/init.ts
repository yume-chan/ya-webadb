import type { PrevImpl } from "./prev.js";

export interface Init extends Omit<PrevImpl.Init, "sendCodecMeta"> {
    minSizeAlignment?: 1 | 2 | 4 | 8 | 16 | undefined;

    cameraZoom?: number | undefined;
    cameraTorch?: boolean | undefined;

    flexDisplay?: boolean | undefined;

    keepActive?: boolean | undefined;

    sendStreamMeta?: boolean | undefined;
}
