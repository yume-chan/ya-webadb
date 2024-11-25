import { ScrcpyControlMessageType } from "../../base/index.js";

import { PrevImpl } from "./prev.js";

export const ControlMessageTypes: readonly ScrcpyControlMessageType[] =
    /* #__PURE__ */ (() => {
        const result = PrevImpl.ControlMessageTypes.slice();
        result.splice(6, 0, ScrcpyControlMessageType.ExpandSettingPanel);
        return result;
    })();
