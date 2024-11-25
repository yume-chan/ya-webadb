import { ScrcpyControlMessageType } from "../../base/index.js";

import { PrevImpl } from "./prev.js";

export const ControlMessageTypes: readonly ScrcpyControlMessageType[] =
    /* #__PURE__ */ (() => [
        ...PrevImpl.ControlMessageTypes,
        ScrcpyControlMessageType.UHidCreate,
        ScrcpyControlMessageType.UHidInput,
        ScrcpyControlMessageType.OpenHardKeyboardSettings,
    ])();
