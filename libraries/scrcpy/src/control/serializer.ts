import {
    type WritableStream,
    type WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";

import {
    type ScrcpyOptions,
    type ScrcpyScrollController,
} from "../options/index.js";

import {
    ScrcpyInjectKeyCodeControlMessage,
    type AndroidKeyEventAction,
} from "./inject-keycode.js";
import { type ScrcpyInjectScrollControlMessage } from "./inject-scroll.js";
import { ScrcpyInjectTextControlMessage } from "./inject-text.js";
import { ScrcpyInjectTouchControlMessage } from "./inject-touch.js";
import { ScrcpyRotateDeviceControlMessage } from "./rotate-device.js";
import {
    ScrcpySetScreenPowerModeControlMessage,
    type AndroidScreenPowerMode,
} from "./set-screen-power-mode.js";
import { ScrcpyControlMessageType } from "./type.js";

export class ScrcpyControlMessageSerializer {
    private options: ScrcpyOptions<object>;
    /** Control message type values for current version of server */
    private types: ScrcpyControlMessageType[];
    private writer: WritableStreamDefaultWriter<Uint8Array>;
    private scrollController: ScrcpyScrollController;

    public constructor(
        stream: WritableStream<Uint8Array>,
        options: ScrcpyOptions<object>
    ) {
        this.writer = stream.getWriter();

        this.options = options;
        this.types = options.getControlMessageTypes();
        this.scrollController = options.getScrollController();
    }

    public getTypeValue(type: ScrcpyControlMessageType): number {
        const value = this.types.indexOf(type);
        if (value === -1) {
            throw new Error("Not supported");
        }
        return value;
    }

    public injectKeyCode(
        message: Omit<ScrcpyInjectKeyCodeControlMessage, "type">
    ) {
        return this.writer.write(
            ScrcpyInjectKeyCodeControlMessage.serialize({
                ...message,
                type: this.getTypeValue(ScrcpyControlMessageType.InjectKeyCode),
            })
        );
    }

    public injectText(text: string) {
        return this.writer.write(
            ScrcpyInjectTextControlMessage.serialize({
                text,
                type: this.getTypeValue(ScrcpyControlMessageType.InjectText),
            })
        );
    }

    /**
     * `pressure` is a float value between 0 and 1.
     */
    public injectTouch(message: Omit<ScrcpyInjectTouchControlMessage, "type">) {
        return this.writer.write(
            ScrcpyInjectTouchControlMessage.serialize({
                ...message,
                type: this.getTypeValue(ScrcpyControlMessageType.InjectTouch),
            })
        );
    }

    /**
     * `scrollX` and `scrollY` are float values between 0 and 1.
     */
    public injectScroll(
        message: Omit<ScrcpyInjectScrollControlMessage, "type">
    ) {
        (message as ScrcpyInjectScrollControlMessage).type = this.getTypeValue(
            ScrcpyControlMessageType.InjectScroll
        );

        const data = this.scrollController.serializeScrollMessage(
            message as ScrcpyInjectScrollControlMessage
        );
        if (!data) {
            return;
        }

        return this.writer.write(data);
    }

    public async backOrScreenOn(action: AndroidKeyEventAction) {
        const buffer = this.options.serializeBackOrScreenOnControlMessage({
            action,
            type: this.getTypeValue(ScrcpyControlMessageType.BackOrScreenOn),
        });

        if (buffer) {
            return await this.writer.write(buffer);
        }
    }

    public setScreenPowerMode(mode: AndroidScreenPowerMode) {
        return this.writer.write(
            ScrcpySetScreenPowerModeControlMessage.serialize({
                mode,
                type: this.getTypeValue(
                    ScrcpyControlMessageType.SetScreenPowerMode
                ),
            })
        );
    }

    public rotateDevice() {
        return this.writer.write(
            ScrcpyRotateDeviceControlMessage.serialize({
                type: this.getTypeValue(ScrcpyControlMessageType.RotateDevice),
            })
        );
    }

    public close() {
        return this.writer.close();
    }
}
