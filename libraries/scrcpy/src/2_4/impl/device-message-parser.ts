import type { AsyncExactReadable } from "@yume-chan/struct";

import type { ScrcpyDeviceMessageParser } from "../../base/device-message.js";

import { PrevImpl } from "./prev.js";
import { UHidOutputStream } from "./uhid-output-stream.js";

export class DeviceMessageParser<TOptions extends object>
    extends PrevImpl.DeviceMessageParser<TOptions>
    implements ScrcpyDeviceMessageParser
{
    #uHidOutput: UHidOutputStream;

    get uHidOutput(): UHidOutputStream {
        return this.#uHidOutput;
    }

    constructor(clipboardEnabled: boolean, controlEnabled: boolean) {
        super(clipboardEnabled, controlEnabled);
        this.#uHidOutput = new UHidOutputStream();
    }

    override async parse(id: number, stream: AsyncExactReadable) {
        if (id === 2) {
            return this.#uHidOutput.parse(stream);
        }

        return super.parse(id, stream);
    }

    override close() {
        this.#uHidOutput.close();
        super.close();
    }

    override error(e?: unknown) {
        this.#uHidOutput.error(e);
        super.error(e);
    }
}
