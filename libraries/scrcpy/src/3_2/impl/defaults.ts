import type { Init } from "./init.js";
import { PrevImpl } from "./prev.js";

export const Defaults = /* #__PURE__ */ (() =>
    ({
        ...PrevImpl.Defaults,
        displayImePolicy: undefined,
    }) as const satisfies Required<Init<true>>)();
