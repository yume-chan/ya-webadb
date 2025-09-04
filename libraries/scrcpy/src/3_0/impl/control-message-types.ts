import { ScrcpyControlMessageType } from "../../base/index.js";

import { PrevImpl } from "./prev.js";

export const ControlMessageTypes: readonly ScrcpyControlMessageType[] = [
    ...PrevImpl.ControlMessageTypes,
    ScrcpyControlMessageType.StartApp,
    ScrcpyControlMessageType.ResetVideo,
];
