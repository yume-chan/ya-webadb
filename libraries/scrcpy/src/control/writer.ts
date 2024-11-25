import type { WritableStreamDefaultWriter } from "@yume-chan/stream-extra";
import { Consumable } from "@yume-chan/stream-extra";

import type {
    AndroidKeyEventAction,
    AndroidScreenPowerMode,
} from "../android/index.js";
import type { ScrcpyOptions } from "../base/index.js";
import type {
    ScrcpyInjectScrollControlMessage,
    ScrcpyInjectTouchControlMessage,
    ScrcpySetClipboardControlMessage,
} from "../latest.js";

import type { ScrcpyInjectKeyCodeControlMessage } from "./inject-key-code.js";
import { ScrcpyControlMessageSerializer } from "./serializer.js";

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
        await Consumable.WritableStream.write(this.#writer, message);
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
        await this.write(this.#serializer.setDisplayPower(mode));
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

    async setClipboard(
        message: Omit<ScrcpySetClipboardControlMessage, "type">,
    ) {
        const result = this.#serializer.setClipboard(message);
        if (result instanceof Uint8Array) {
            await this.write(result);
        } else {
            await this.write(result[0]);
            await result[1];
        }
    }

    releaseLock() {
        this.#writer.releaseLock();
    }

    async close() {
        await this.#writer.close();
    }
}
