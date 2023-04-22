import type {
    Consumable,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import { ConsumableWritableStream } from "@yume-chan/stream-extra";

import type { ScrcpyOptions } from "../options/index.js";

import type {
    AndroidKeyEventAction,
    ScrcpyInjectKeyCodeControlMessage,
} from "./inject-keycode.js";
import type { ScrcpyInjectScrollControlMessage } from "./inject-scroll.js";
import type { ScrcpyInjectTouchControlMessage } from "./inject-touch.js";
import { ScrcpyControlMessageSerializer } from "./serializer.js";
import type { AndroidScreenPowerMode } from "./set-screen-power-mode.js";

export class ScrcpyControlMessageWriter {
    private _writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>;
    private _serializer: ScrcpyControlMessageSerializer;

    public constructor(
        writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>,
        options: ScrcpyOptions<object>
    ) {
        this._writer = writer;
        this._serializer = new ScrcpyControlMessageSerializer(options);
    }

    private async write(message: Uint8Array) {
        return await ConsumableWritableStream.write(this._writer, message);
    }

    public injectKeyCode(
        message: Omit<ScrcpyInjectKeyCodeControlMessage, "type">
    ) {
        return this.write(this._serializer.injectKeyCode(message));
    }

    public injectText(text: string) {
        return this.write(this._serializer.injectText(text));
    }

    /**
     * `pressure` is a float value between 0 and 1.
     */
    public injectTouch(message: Omit<ScrcpyInjectTouchControlMessage, "type">) {
        return this.write(this._serializer.injectTouch(message));
    }

    /**
     * `scrollX` and `scrollY` are float values between 0 and 1.
     */
    public async injectScroll(
        message: Omit<ScrcpyInjectScrollControlMessage, "type">
    ) {
        const data = this._serializer.injectScroll(message);
        if (data) {
            await this.write(data);
        }
    }

    public async backOrScreenOn(action: AndroidKeyEventAction) {
        const data = this._serializer.backOrScreenOn(action);
        if (data) {
            await this.write(data);
        }
    }

    public setScreenPowerMode(mode: AndroidScreenPowerMode) {
        return this.write(this._serializer.setScreenPowerMode(mode));
    }

    public rotateDevice() {
        return this.write(this._serializer.rotateDevice());
    }

    public releaseLock() {
        this._writer.releaseLock();
    }

    public close() {
        return this._writer.close();
    }
}
