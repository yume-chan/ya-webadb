import type { Init } from "./init.js";
import { PrevImpl } from "./prev.js";

export const Defaults = /* #__PURE__ */ (() =>
    ({
        ...PrevImpl.Defaults,
        downsizeOnError: true,
        sendDeviceMeta: true,
        sendDummyByte: true,
    }) as const satisfies Required<Init>)();
