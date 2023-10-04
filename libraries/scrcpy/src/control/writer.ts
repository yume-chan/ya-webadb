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
    #writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>;
    #serializer: ScrcpyControlMessageSerializer;

    constructor(
        writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>,
        options: ScrcpyOptions<object>,
    ) {
        this.#writer = writer;
        this.#serializer = new ScrcpyControlMessageSerializer(options);
    }

    async write(message: Uint8Array) {
        await ConsumableWritableStream.write(this.#writer, message);
    }

    async injectKeyCode(
        message: Omit<ScrcpyInjectKeyCodeControlMessage, "type">,
    ) {
        await this.write(this.#serializer.injectKeyCode(message));
    }

    async injectText(text: string) {
        await this.write(this.#serializer.injectText(text));
    }

    /**
     * `pressure` is a float value between 0 and 1.
     */
    async injectTouch(message: Omit<ScrcpyInjectTouchControlMessage, "type">) {
        await this.write(this.#serializer.injectTouch(message));
    }

    /**
     * `scrollX` and `scrollY` are float values between 0 and 1.
     */
    async injectScroll(
        message: Omit<ScrcpyInjectScrollControlMessage, "type">,
    ) {
        const data = this.#serializer.injectScroll(message);
        if (data) {
            await this.write(data);
        }
    }

    async backOrScreenOn(action: AndroidKeyEventAction) {
        const data = this.#serializer.backOrScreenOn(action);
        if (data) {
            await this.write(data);
        }
    }

    async setScreenPowerMode(mode: AndroidScreenPowerMode) {
        await this.write(this.#serializer.setScreenPowerMode(mode));
    }

    async expandNotificationPanel() {
        await this.write(this.#serializer.expandNotificationPanel());
    }

    async expandSettingPanel() {
        await this.write(this.#serializer.expandSettingPanel());
    }

    async collapseNotificationPanel() {
        await this.write(this.#serializer.collapseNotificationPanel());
    }

    async rotateDevice() {
        await this.write(this.#serializer.rotateDevice());
    }

    releaseLock() {
        this.#writer.releaseLock();
    }

    async close() {
        await this.#writer.close();
    }
}
