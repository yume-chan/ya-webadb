import type {
    ScrcpyOptions,
    ScrcpyScrollController,
} from "../options/index.js";

import { BasicControlMessage } from "./basic.js";
import type { AndroidKeyEventAction } from "./inject-keycode.js";
import { ScrcpyInjectKeyCodeControlMessage } from "./inject-keycode.js";
import type { ScrcpyInjectScrollControlMessage } from "./inject-scroll.js";
import { ScrcpyInjectTextControlMessage } from "./inject-text.js";
import type { ScrcpyInjectTouchControlMessage } from "./inject-touch.js";
import { ScrcpyRotateDeviceControlMessage } from "./rotate-device.js";
import type { AndroidScreenPowerMode } from "./set-screen-power-mode.js";
import { ScrcpySetScreenPowerModeControlMessage } from "./set-screen-power-mode.js";
import {
    ScrcpyControlMessageType,
    ScrcpyControlMessageTypeValue,
} from "./type.js";

export class ScrcpyControlMessageSerializer {
    #options: ScrcpyOptions<object>;
    #typeValues: ScrcpyControlMessageTypeValue;
    #scrollController: ScrcpyScrollController;

    constructor(options: ScrcpyOptions<object>) {
        this.#options = options;
        this.#typeValues = new ScrcpyControlMessageTypeValue(options);
        this.#scrollController = options.createScrollController();
    }

    injectKeyCode(message: Omit<ScrcpyInjectKeyCodeControlMessage, "type">) {
        return ScrcpyInjectKeyCodeControlMessage.serialize(
            this.#typeValues.fillMessageType(
                message,
                ScrcpyControlMessageType.InjectKeyCode,
            ),
        );
    }

    injectText(text: string) {
        return ScrcpyInjectTextControlMessage.serialize({
            text,
            type: this.#typeValues.get(ScrcpyControlMessageType.InjectText),
        });
    }

    /**
     * `pressure` is a float value between 0 and 1.
     */
    injectTouch(message: Omit<ScrcpyInjectTouchControlMessage, "type">) {
        return this.#options.serializeInjectTouchControlMessage(
            this.#typeValues.fillMessageType(
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
            this.#typeValues.fillMessageType(
                message,
                ScrcpyControlMessageType.InjectScroll,
            ),
        );
    }

    backOrScreenOn(action: AndroidKeyEventAction) {
        return this.#options.serializeBackOrScreenOnControlMessage({
            action,
            type: this.#typeValues.get(ScrcpyControlMessageType.BackOrScreenOn),
        });
    }

    setScreenPowerMode(mode: AndroidScreenPowerMode) {
        return ScrcpySetScreenPowerModeControlMessage.serialize({
            mode,
            type: this.#typeValues.get(
                ScrcpyControlMessageType.SetScreenPowerMode,
            ),
        });
    }

    expandNotificationPanel() {
        return BasicControlMessage.serialize({
            type: this.#typeValues.get(
                ScrcpyControlMessageType.ExpandNotificationPanel,
            ),
        });
    }

    expandSettingPanel() {
        return BasicControlMessage.serialize({
            type: this.#typeValues.get(
                ScrcpyControlMessageType.ExpandSettingPanel,
            ),
        });
    }

    collapseNotificationPanel() {
        return BasicControlMessage.serialize({
            type: this.#typeValues.get(
                ScrcpyControlMessageType.CollapseNotificationPanel,
            ),
        });
    }

    rotateDevice() {
        return ScrcpyRotateDeviceControlMessage.serialize({
            type: this.#typeValues.get(ScrcpyControlMessageType.RotateDevice),
        });
    }
}
