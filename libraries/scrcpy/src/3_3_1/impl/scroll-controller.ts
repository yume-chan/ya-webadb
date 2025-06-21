import type { ScrcpyScrollController } from "../../base/index.js";
import type { ScrcpyInjectScrollControlMessage } from "../../latest.js";

import { PrevImpl } from "./prev.js";

export class ScrollController implements ScrcpyScrollController {
    serializeScrollMessage(
        message: ScrcpyInjectScrollControlMessage,
    ): Uint8Array | undefined {
        message = {
            ...message,
            scrollX: message.scrollX / 16,
            scrollY: message.scrollY / 16,
        };
        return PrevImpl.InjectScrollControlMessage.serialize(message);
    }
}

export function createScrollController(): ScrcpyScrollController {
    return new ScrollController();
}
