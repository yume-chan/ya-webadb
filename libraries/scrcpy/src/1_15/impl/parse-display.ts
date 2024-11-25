import type { ScrcpyDisplay } from "../../base/index.js";

export function parseDisplay(line: string): ScrcpyDisplay | undefined {
    const match = line.match(/^\s+scrcpy --display (\d+)$/);
    if (match) {
        return {
            id: Number.parseInt(match[1]!, 10),
        };
    }
    return undefined;
}
