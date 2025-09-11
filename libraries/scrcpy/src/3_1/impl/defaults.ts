import type { Init } from "./init.js";
import { PrevImpl } from "./prev.js";

export const Defaults = {
    ...PrevImpl.Defaults,
    vdDestroyContent: false,
} as const satisfies Required<Init<true>>;
