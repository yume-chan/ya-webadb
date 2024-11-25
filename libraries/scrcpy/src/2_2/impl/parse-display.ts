import type { ScrcpyDisplay } from "../../base/index.js";

export function parseDisplay(line: string): ScrcpyDisplay | undefined {
    const match = line.match(/^\s+--display-id=(\d+)\s+\(([^)]+)\)$/);
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
