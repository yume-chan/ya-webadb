import type { ScrcpyDisplay } from "../../base/index.js";

export function parseDisplay(line: string): ScrcpyDisplay | undefined {
    // The client-side option name is `--display`
    // but the server-side option name is always `display_id`
    const match = line.match(/^\s+--display=(\d+)\s+\(([^)]+)\)$/);
    if (match) {
        const display: ScrcpyDisplay = {
            id: Number.parseInt(match[1]!, 10),
        };
        if (match[2] !== "size unknown") {
            display.resolution = match[2]!;
        }
        return display;
    }
    return undefined;
}
