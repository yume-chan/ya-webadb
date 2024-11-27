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
    ScrcpyUHidCreateControlMessage,
} from "../latest.js";

import type { ScrcpyInjectKeyCodeControlMessage } from "./inject-key-code.js";
import { ScrcpyControlMessageSerializer } from "./serializer.js";
import type { ScrcpyUHidInputControlMessage } from "./uhid.js";

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

    write(message: Uint8Array) {
        return Consumable.WritableStream.write(this.#writer, message);
    }

    injectKeyCode(message: Omit<ScrcpyInjectKeyCodeControlMessage, "type">) {
        return this.write(this.#serializer.injectKeyCode(message));
    }

    injectText(text: string) {
        return this.write(this.#serializer.injectText(text));
    }

    /**
     * `pressure` is a float value between 0 and 1.
     */
    injectTouch(message: Omit<ScrcpyInjectTouchControlMessage, "type">) {
        return this.write(this.#serializer.injectTouch(message));
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

    setScreenPowerMode(mode: AndroidScreenPowerMode) {
        return this.write(this.#serializer.setDisplayPower(mode));
    }

    expandNotificationPanel() {
        return this.write(this.#serializer.expandNotificationPanel());
    }

    expandSettingPanel() {
        return this.write(this.#serializer.expandSettingPanel());
    }

    collapseNotificationPanel() {
        return this.write(this.#serializer.collapseNotificationPanel());
    }

    rotateDevice() {
        return this.write(this.#serializer.rotateDevice());
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

    uHidCreate(message: Omit<ScrcpyUHidCreateControlMessage, "type">) {
        return this.write(this.#serializer.uHidCreate(message));
    }

    uHidInput(message: Omit<ScrcpyUHidInputControlMessage, "type">) {
        return this.write(this.#serializer.uHidInput(message));
    }

    uHidDestroy(id: number) {
        return this.write(this.#serializer.uHidDestroy(id));
    }

    startApp(
        name: string,
        options?: { forceStop?: boolean; searchByName?: boolean },
    ) {
        return this.write(this.#serializer.startApp(name, options));
    }

    resetVideo() {
        return this.write(this.#serializer.resetVideo());
    }

    releaseLock() {
        this.#writer.releaseLock();
    }

    async close() {
        await this.#writer.close();
    }
}
