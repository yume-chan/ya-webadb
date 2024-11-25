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
import { ScrcpyControlMessageTypeMap } from "./message-type-map.js";
import { ScrcpySetDisplayPowerControlMessage } from "./set-screen-power-mode.js";
import { ScrcpyStartAppControlMessage } from "./start-app.js";
import {
    ScrcpyUHidDestroyControlMessage,
    ScrcpyUHidInputControlMessage,
} from "./uhid.js";

export class ScrcpyControlMessageSerializer {
    #options: ScrcpyOptions<object>;
    #typeMap: ScrcpyControlMessageTypeMap;
    #scrollController: ScrcpyScrollController;

    constructor(options: ScrcpyOptions<object>) {
        this.#options = options;
        this.#typeMap = new ScrcpyControlMessageTypeMap(options);
        this.#scrollController = options.createScrollController();
    }

    injectKeyCode(message: Omit<ScrcpyInjectKeyCodeControlMessage, "type">) {
        return ScrcpyInjectKeyCodeControlMessage.serialize(
            this.#typeMap.fillMessageType(
                message,
                ScrcpyControlMessageType.InjectKeyCode,
            ),
        );
    }

    injectText(text: string) {
        return ScrcpyInjectTextControlMessage.serialize({
            text,
            type: this.#typeMap.get(ScrcpyControlMessageType.InjectText),
        });
    }

    /**
     * `pressure` is a float value between 0 and 1.
     */
    injectTouch(message: Omit<ScrcpyInjectTouchControlMessage, "type">) {
        return this.#options.serializeInjectTouchControlMessage(
            this.#typeMap.fillMessageType(
                message,
                ScrcpyControlMessageType.InjectTouch,
            ),
        );
    }

    /**
     * `scrollX` and `scrollY` are float values between 0 and 1.
     */
    injectScroll(message: Omit<ScrcpyInjectScrollControlMessage, "type">) {
        return this.#scrollController.serializeScrollMessage(
            this.#typeMap.fillMessageType(
                message,
                ScrcpyControlMessageType.InjectScroll,
            ),
        );
    }

    backOrScreenOn(action: AndroidKeyEventAction) {
        return this.#options.serializeBackOrScreenOnControlMessage({
            action,
            type: this.#typeMap.get(ScrcpyControlMessageType.BackOrScreenOn),
        });
    }

    setDisplayPower(mode: AndroidScreenPowerMode) {
        return ScrcpySetDisplayPowerControlMessage.serialize({
            mode,
            type: this.#typeMap.get(ScrcpyControlMessageType.SetDisplayPower),
        });
    }

    expandNotificationPanel() {
        return EmptyControlMessage.serialize({
            type: this.#typeMap.get(
                ScrcpyControlMessageType.ExpandNotificationPanel,
            ),
        });
    }

    expandSettingPanel() {
        return EmptyControlMessage.serialize({
            type: this.#typeMap.get(
                ScrcpyControlMessageType.ExpandSettingPanel,
            ),
        });
    }

    collapseNotificationPanel() {
        return EmptyControlMessage.serialize({
            type: this.#typeMap.get(
                ScrcpyControlMessageType.CollapseNotificationPanel,
            ),
        });
    }

    rotateDevice() {
        return EmptyControlMessage.serialize({
            type: this.#typeMap.get(ScrcpyControlMessageType.RotateDevice),
        });
    }

    setClipboard(message: Omit<ScrcpySetClipboardControlMessage, "type">) {
        return this.#options.serializeSetClipboardControlMessage({
            ...message,
            type: this.#typeMap.get(ScrcpyControlMessageType.SetClipboard),
        });
    }

    uHidCreate(message: Omit<ScrcpyUHidCreateControlMessage, "type">) {
        if (!this.#options.serializeUHidCreateControlMessage) {
            throw new Error("UHid not supported");
        }

        return this.#options.serializeUHidCreateControlMessage(
            this.#typeMap.fillMessageType(
                message,
                ScrcpyControlMessageType.UHidCreate,
            ),
        );
    }

    uHidInput(message: Omit<ScrcpyUHidInputControlMessage, "type">) {
        return ScrcpyUHidInputControlMessage.serialize(
            this.#typeMap.fillMessageType(
                message,
                ScrcpyControlMessageType.UHidInput,
            ),
        );
    }

    uHidDestroy(id: number) {
        return ScrcpyUHidDestroyControlMessage.serialize({
            type: this.#typeMap.get(ScrcpyControlMessageType.UHidDestroy),
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
            type: this.#typeMap.get(ScrcpyControlMessageType.StartApp),
            name,
        });
    }

    resetVideo() {
        return EmptyControlMessage.serialize({
            type: this.#typeMap.get(ScrcpyControlMessageType.ResetVideo),
        });
    }
}
