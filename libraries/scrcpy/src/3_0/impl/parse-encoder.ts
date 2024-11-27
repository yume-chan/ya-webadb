import type { ScrcpyEncoder } from "../../base/index.js";

const EncoderRegex =
    /^\s+--(video|audio)-codec=(\S+)\s+--\1-encoder=(\S+)(?:\s*\((sw|hw|hybrid)\))?(?:\s*\[vendor\])?(?:\s*\(alias for (\S+)\))?$/;

function toHardwareType(value: string): ScrcpyEncoder["hardwareType"] {
    switch (value) {
        case "sw":
            return "software";
        case "hw":
            return "hardware";
        case "hybrid":
            return "hybrid";
        default:
            throw new Error(`Unknown hardware type: ${value}`);
    }
}

export function parseEncoder(line: string): ScrcpyEncoder | undefined {
    const match = line.match(EncoderRegex);
    return match
        ? {
              type: match[1]! as "video" | "audio",
              name: match[3]!,
              codec: match[2]!,
              hardwareType: match[4] ? toHardwareType(match[4]) : undefined,
              vendor: !!match[5],
              aliasFor: match[6],
          }
        : undefined;
}
