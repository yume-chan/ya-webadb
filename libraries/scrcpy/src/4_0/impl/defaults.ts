import { omit } from "../../utils/omit.js";

import type { Init } from "./init.js";
import { PrevImpl } from "./prev.js";

export const Defaults = /* #__PURE__*/ (() =>
    ({
        ...omit(PrevImpl.Defaults, "sendCodecMeta"),

        minSizeAlignment: 1,

        cameraZoom: 1,
        cameraTorch: false,

        flexDisplay: false,

        keepActive: false,

        sendStreamMeta: true,
    }) as const satisfies Required<Init>)();
