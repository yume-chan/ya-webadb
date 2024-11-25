import { ScrcpyControlMessageType } from "../../base/index.js";

import { PrevImpl } from "./prev.js";

export const ControlMessageTypes: readonly ScrcpyControlMessageType[] =
    /* #__PURE__ */ (() => {
        const result = PrevImpl.ControlMessageTypes.slice();
        result.splice(14, 0, ScrcpyControlMessageType.UHidDestroy);
        return result;
    })();
