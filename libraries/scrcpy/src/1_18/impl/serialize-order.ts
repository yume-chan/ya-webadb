import type { Init } from "./init.js";
import { PrevImpl } from "./prev.js";

export const SerializeOrder = /* #__PURE__ */ (() =>
    [
        ...PrevImpl.SerializeOrder,
        "powerOffOnClose",
    ] as const satisfies readonly (keyof Init)[])();
