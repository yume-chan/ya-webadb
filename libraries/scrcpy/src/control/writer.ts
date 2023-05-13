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
        await ConsumableWritableStream.write(this._writer, message);
    }

    public async injectKeyCode(
        message: Omit<ScrcpyInjectKeyCodeControlMessage, "type">
    ) {
        await this.write(this._serializer.injectKeyCode(message));
    }

    public async injectText(text: string) {
        await this.write(this._serializer.injectText(text));
    }

    /**
     * `pressure` is a float value between 0 and 1.
     */
    public async injectTouch(
        message: Omit<ScrcpyInjectTouchControlMessage, "type">
    ) {
        await this.write(this._serializer.injectTouch(message));
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

    public async setScreenPowerMode(mode: AndroidScreenPowerMode) {
        await this.write(this._serializer.setScreenPowerMode(mode));
    }

    public async rotateDevice() {
        await this.write(this._serializer.rotateDevice());
    }

    public releaseLock() {
        this._writer.releaseLock();
    }

    public async close() {
        await this._writer.close();
    }
}
