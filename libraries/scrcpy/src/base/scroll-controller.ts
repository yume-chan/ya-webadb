import type { ScrcpyInjectScrollControlMessage } from "../latest.js";

export interface ScrcpyScrollController {
    serializeScrollMessage(
        message: ScrcpyInjectScrollControlMessage,
    ): Uint8Array | undefined;
}
