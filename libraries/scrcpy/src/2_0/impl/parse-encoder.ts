import type { ScrcpyEncoder } from "../../base/index.js";

const EncoderRegex =
    /^\s+--(video|audio)-codec=(\S+)\s+--\1-encoder='([^']+)'$/;

export function parseEncoder(line: string): ScrcpyEncoder | undefined {
    const match = line.match(EncoderRegex);
    return match
        ? {
              type: match[1]! as "video" | "audio",
              name: match[3]!,
              codec: match[2]!,
          }
        : undefined;
}
