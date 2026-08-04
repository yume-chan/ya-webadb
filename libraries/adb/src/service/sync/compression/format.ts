import * as Format from "./format-ns.js";

type Format = (typeof Format)[keyof typeof Format];

export const FormatNameMap = /* #__PURE__ */ (() =>
    Object.fromEntries(
        Object.entries(Format).map(([key, value]) => [value, key]),
    ))() as Record<Format, string>;

export { Format };
