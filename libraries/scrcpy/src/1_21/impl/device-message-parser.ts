import type { AsyncExactReadable } from "@yume-chan/struct";

import { ScrcpyDeviceMessageParser1_15 } from "../../1_15/impl/device-message-parser.js";
import type { ScrcpyDeviceMessageParser } from "../../base/device-message.js";

import { AckClipboardHandler } from "./set-clipboard.js";

export class ScrcpyDeviceMessageParser1_21<TOptions extends object>
    extends ScrcpyDeviceMessageParser1_15<TOptions>
    implements ScrcpyDeviceMessageParser
{
    #ackClipboardHandler: AckClipboardHandler;

    get ackClipboardHandler(): AckClipboardHandler {
        return this.#ackClipboardHandler;
    }

    constructor(clipboardEnabled: boolean, controlEnabled: boolean) {
        super(clipboardEnabled, controlEnabled);

        this.#ackClipboardHandler = new AckClipboardHandler();
    }

    override async parse(id: number, stream: AsyncExactReadable) {
        if (id === 1) {
            return this.#ackClipboardHandler.parse(stream);
        }

        return super.parse(id, stream);
    }

    override close() {
        this.#ackClipboardHandler.close();
        super.close();
    }

    override error(e?: unknown) {
        this.#ackClipboardHandler.error(e);
        super.error(e);
    }
}
