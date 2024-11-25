import type { ScrcpyEncoder } from "../../base/index.js";

export function parseEncoder(
    line: string,
    encoderNameRegex: RegExp,
): ScrcpyEncoder | undefined {
    const match = line.match(encoderNameRegex);
    if (match) {
        return { type: "video", name: match[1]! };
    }
    return undefined;
}

export const EncoderRegex = /^\s+scrcpy --encoder-name '([^']+)'$/;
