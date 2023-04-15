import type {
    ScrcpyOptions,
    ScrcpyScrollController,
} from "../options/index.js";

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
    private _options: ScrcpyOptions<object>;
    private _typeValues: ScrcpyControlMessageTypeValue;
    private _scrollController: ScrcpyScrollController;

    public constructor(options: ScrcpyOptions<object>) {
        this._options = options;
        this._typeValues = new ScrcpyControlMessageTypeValue(options);
        this._scrollController = options.createScrollController();
    }

    public injectKeyCode(
        message: Omit<ScrcpyInjectKeyCodeControlMessage, "type">
    ) {
        return ScrcpyInjectKeyCodeControlMessage.serialize(
            this._typeValues.fillMessageType(
                message,
                ScrcpyControlMessageType.InjectKeyCode
            )
        );
    }

    public injectText(text: string) {
        return ScrcpyInjectTextControlMessage.serialize({
            text,
            type: this._typeValues.get(ScrcpyControlMessageType.InjectText),
        });
    }

    /**
     * `pressure` is a float value between 0 and 1.
     */
    public injectTouch(message: Omit<ScrcpyInjectTouchControlMessage, "type">) {
        return this._options.serializeInjectTouchControlMessage(
            this._typeValues.fillMessageType(
                message,
                ScrcpyControlMessageType.InjectTouch
            )
        );
    }

    /**
     * `scrollX` and `scrollY` are float values between 0 and 1.
     */
    public injectScroll(
        message: Omit<ScrcpyInjectScrollControlMessage, "type">
    ) {
        return this._scrollController.serializeScrollMessage(
            this._typeValues.fillMessageType(
                message,
                ScrcpyControlMessageType.InjectScroll
            )
        );
    }

    public backOrScreenOn(action: AndroidKeyEventAction) {
        return this._options.serializeBackOrScreenOnControlMessage({
            action,
            type: this._typeValues.get(ScrcpyControlMessageType.BackOrScreenOn),
        });
    }

    public setScreenPowerMode(mode: AndroidScreenPowerMode) {
        return ScrcpySetScreenPowerModeControlMessage.serialize({
            mode,
            type: this._typeValues.get(
                ScrcpyControlMessageType.SetScreenPowerMode
            ),
        });
    }

    public rotateDevice() {
        return ScrcpyRotateDeviceControlMessage.serialize({
            type: this._typeValues.get(ScrcpyControlMessageType.RotateDevice),
        });
    }
}
