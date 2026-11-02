import type { Init } from "./init.js";
import { PrevImpl } from "./prev.js";

export const Defaults = {
    ...PrevImpl.Defaults,
    cleanup: true,
} as const satisfies Required<Init>;
