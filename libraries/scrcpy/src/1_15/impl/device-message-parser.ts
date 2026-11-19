import type { AsyncExactReadable } from "@yume-chan/struct";

import type {
    ScrcpyDeviceMessageClipboard,
    ScrcpyDeviceMessageParser,
} from "../../base/device-message.js";

import { ClipboardStream } from "./clipboard-stream.js";

export class DeviceMessageParser<
    TOptions extends object,
> implements ScrcpyDeviceMessageParser {
    #clipboard: ClipboardStream | undefined;

    get clipboard(): ScrcpyDeviceMessageClipboard<TOptions> {
        return this.#clipboard as never;
    }

    constructor(clipboardEnabled: boolean, controlEnabled: boolean) {
        if (!controlEnabled) {
            throw new Error("control is disabled");
        }

        if (clipboardEnabled) {
            this.#clipboard = new ClipboardStream();
        }
    }

    async parse(id: number, stream: AsyncExactReadable) {
        if (id === 0 && this.#clipboard) {
            return this.#clipboard.parse(stream);
        }

        throw new Error(`Unknown device message id: ${id}`);
    }

    close() {
        this.#clipboard?.close();
    }

    error(e?: unknown) {
        this.#clipboard?.error(e);
    }
}
