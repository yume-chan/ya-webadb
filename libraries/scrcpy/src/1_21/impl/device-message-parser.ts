import type { AsyncExactReadable } from "@yume-chan/struct";

import type { ScrcpyDeviceMessageParser } from "../../base/device-message.js";

import { PrevImpl } from "./prev.js";
import { AckClipboardHandler } from "./set-clipboard.js";

export class DeviceMessageParser<TOptions extends object>
    extends PrevImpl.DeviceMessageParser<TOptions>
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
