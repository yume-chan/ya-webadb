import type {
    AndroidKeyEventAction,
    AndroidScreenPowerMode,
} from "../android/index.js";
import type { ScrcpyOptions, ScrcpyScrollController } from "../base/index.js";
import { ScrcpyControlMessageType } from "../base/index.js";
import type {
    ScrcpyInjectScrollControlMessage,
    ScrcpyInjectTouchControlMessage,
    ScrcpySetClipboardControlMessage,
    ScrcpyUHidCreateControlMessage,
} from "../latest.js";

import { EmptyControlMessage } from "./empty.js";
import { ScrcpyInjectKeyCodeControlMessage } from "./inject-key-code.js";
import { ScrcpyInjectTextControlMessage } from "./inject-text.js";
import { ScrcpySetDisplayPowerControlMessage } from "./set-screen-power-mode.js";
import { ScrcpyStartAppControlMessage } from "./start-app.js";
import {
    ScrcpyUHidDestroyControlMessage,
    ScrcpyUHidInputControlMessage,
} from "./uhid.js";

export class ScrcpyControlMessageSerializer {
    #options: ScrcpyOptions<object>;
    #scrollController: ScrcpyScrollController;

    constructor(options: ScrcpyOptions<object>) {
        this.#options = options;
        this.#scrollController = options.createScrollController();
    }

    getType(type: ScrcpyControlMessageType): number {
        const value = this.#options.controlMessageTypes[type];
        if (value === undefined) {
            throw new TypeError(`Invalid control message type: ${type}`);
        }
        return value;
    }

    #addType<T extends { type: number }>(
        message: Omit<T, "type">,
        type: ScrcpyControlMessageType,
    ): T {
        (message as T).type = this.getType(type);
        return message as T;
    }

    injectKeyCode(message: Omit<ScrcpyInjectKeyCodeControlMessage, "type">) {
        return ScrcpyInjectKeyCodeControlMessage.serialize(
            this.#addType(message, ScrcpyControlMessageType.InjectKeyCode),
        );
    }

    injectText(text: string) {
        return ScrcpyInjectTextControlMessage.serialize({
            text,
            type: this.getType(ScrcpyControlMessageType.InjectText),
        });
    }

    /**
     * `pressure` is a float value between 0 and 1.
     */
    injectTouch(message: Omit<ScrcpyInjectTouchControlMessage, "type">) {
        return this.#options.serializeInjectTouchControlMessage(
            this.#addType(message, ScrcpyControlMessageType.InjectTouch),
        );
    }

    /**
     * `scrollX` and `scrollY` are float values between 0 and 1.
     */
    injectScroll(message: Omit<ScrcpyInjectScrollControlMessage, "type">) {
        return this.#scrollController.serializeScrollMessage(
            this.#addType(message, ScrcpyControlMessageType.InjectScroll),
        );
    }

    backOrScreenOn(action: AndroidKeyEventAction) {
        return this.#options.serializeBackOrScreenOnControlMessage({
            action,
            type: this.getType(ScrcpyControlMessageType.BackOrScreenOn),
        });
    }

    setDisplayPower(mode: AndroidScreenPowerMode) {
        return ScrcpySetDisplayPowerControlMessage.serialize({
            mode,
            type: this.getType(ScrcpyControlMessageType.SetDisplayPower),
        });
    }

    expandNotificationPanel() {
        return EmptyControlMessage.serialize({
            type: this.getType(
                ScrcpyControlMessageType.ExpandNotificationPanel,
            ),
        });
    }

    expandSettingPanel() {
        return EmptyControlMessage.serialize({
            type: this.getType(ScrcpyControlMessageType.ExpandSettingPanel),
        });
    }

    collapseNotificationPanel() {
        return EmptyControlMessage.serialize({
            type: this.getType(
                ScrcpyControlMessageType.CollapseNotificationPanel,
            ),
        });
    }

    rotateDevice() {
        return EmptyControlMessage.serialize({
            type: this.getType(ScrcpyControlMessageType.RotateDevice),
        });
    }

    setClipboard(message: Omit<ScrcpySetClipboardControlMessage, "type">) {
        return this.#options.serializeSetClipboardControlMessage({
            ...message,
            type: this.getType(ScrcpyControlMessageType.SetClipboard),
        });
    }

    uHidCreate(message: Omit<ScrcpyUHidCreateControlMessage, "type">) {
        if (!this.#options.serializeUHidCreateControlMessage) {
            throw new Error("UHid not supported");
        }

        return this.#options.serializeUHidCreateControlMessage(
            this.#addType(message, ScrcpyControlMessageType.UHidCreate),
        );
    }

    uHidInput(message: Omit<ScrcpyUHidInputControlMessage, "type">) {
        return ScrcpyUHidInputControlMessage.serialize(
            this.#addType(message, ScrcpyControlMessageType.UHidInput),
        );
    }

    uHidDestroy(id: number) {
        return ScrcpyUHidDestroyControlMessage.serialize({
            type: this.getType(ScrcpyControlMessageType.UHidDestroy),
            id,
        });
    }

    startApp(
        name: string,
        options?: { forceStop?: boolean; searchByName?: boolean },
    ) {
        if (options?.searchByName) {
            name = "?" + name;
        }
        if (options?.forceStop) {
            name = "+" + name;
        }

        return ScrcpyStartAppControlMessage.serialize({
            type: this.getType(ScrcpyControlMessageType.StartApp),
            name,
        });
    }

    resetVideo() {
        return EmptyControlMessage.serialize({
            type: this.getType(ScrcpyControlMessageType.ResetVideo),
        });
    }
}
