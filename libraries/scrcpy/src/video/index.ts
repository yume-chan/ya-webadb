import * as ScrcpyVideoCodecId from "./codec-id.js";

export * from "./android.js";
export * from "./size.js";

type ScrcpyVideoCodecId =
    (typeof ScrcpyVideoCodecId)[keyof typeof ScrcpyVideoCodecId];

export const ScrcpyVideoCodecNameMap = /* #__PURE__ */ (() => {
    const result = new Map<number, string>();
    for (const key in ScrcpyVideoCodecId) {
        const value =
            ScrcpyVideoCodecId[key as keyof typeof ScrcpyVideoCodecId];
        result.set(value, key);
    }
    return result;
})();

export { ScrcpyVideoCodecId };
