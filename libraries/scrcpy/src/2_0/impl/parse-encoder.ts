import type { ScrcpyEncoder } from "../../base/index.js";

export function parseEncoder(line: string): ScrcpyEncoder | undefined {
    let match = line.match(
        /^\s+--video-codec=(\S+)\s+--video-encoder='([^']+)'$/,
    );
    if (match) {
        return {
            type: "video",
            codec: match[1]!,
            name: match[2]!,
        };
    }

    match = line.match(/^\s+--audio-codec=(\S+)\s+--audio-encoder='([^']+)'$/);
    if (match) {
        return {
            type: "audio",
            codec: match[1]!,
            name: match[2]!,
        };
    }

    return undefined;
}
