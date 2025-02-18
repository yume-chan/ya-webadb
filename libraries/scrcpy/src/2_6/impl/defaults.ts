import type { Init } from "./init.js";
import { PrevImpl } from "./prev.js";

export const Defaults = /* #__PURE__ */ (() =>
    ({
        ...PrevImpl.Defaults,
        audioDup: false,
    }) as const satisfies Required<Init<true>>)();
