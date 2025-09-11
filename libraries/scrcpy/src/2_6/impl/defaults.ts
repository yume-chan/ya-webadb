import type { Init } from "./init.js";
import { PrevImpl } from "./prev.js";

export const Defaults = {
    ...PrevImpl.Defaults,
    audioDup: false,
} as const satisfies Required<Init<true>>;
