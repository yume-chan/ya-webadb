import type {
    Consumable,
    WritableStream,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import { ConsumableWritableStream } from "@yume-chan/stream-extra";

import type {
    ScrcpyOptions,
    ScrcpyOptionsInit1_16,
    ScrcpyScrollController,
} from "../options/index.js";

import type { AndroidKeyEventAction } from "./inject-keycode.js";
import { ScrcpyInjectKeyCodeControlMessage } from "./inject-keycode.js";
import type { ScrcpyInjectScrollControlMessage } from "./inject-scroll.js";
import { ScrcpyInjectTextControlMessage } from "./inject-text.js";
import { ScrcpyInjectTouchControlMessage } from "./inject-touch.js";
import { ScrcpyRotateDeviceControlMessage } from "./rotate-device.js";
import type { AndroidScreenPowerMode } from "./set-screen-power-mode.js";
import { ScrcpySetScreenPowerModeControlMessage } from "./set-screen-power-mode.js";
import { ScrcpyControlMessageType } from "./type.js";

export class ScrcpyControlMessageSerializer {
    private options: ScrcpyOptions<ScrcpyOptionsInit1_16>;
    /** Control message type values for current version of server */
    private types: ScrcpyControlMessageType[];
    private writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>;
    private scrollController: ScrcpyScrollController;

    public constructor(
        stream: WritableStream<Consumable<Uint8Array>>,
        options: ScrcpyOptions<ScrcpyOptionsInit1_16>
    ) {
        this.writer = stream.getWriter();

        this.options = options;
        this.types = options.getControlMessageTypes();
        this.scrollController = options.getScrollController();
    }

    public getActualMessageType(type: ScrcpyControlMessageType): number {
        const value = this.types.indexOf(type);
        if (value === -1) {
            throw new Error("Not supported");
        }
        return value;
    }

    public addMessageType<T extends { type: ScrcpyControlMessageType }>(
        message: Omit<T, "type">,
        type: T["type"]
    ): T {
        (message as T).type = this.getActualMessageType(type);
        return message as T;
    }

    private async write(data: Uint8Array) {
        await ConsumableWritableStream.write(this.writer, data);
    }

    public injectKeyCode(
        message: Omit<ScrcpyInjectKeyCodeControlMessage, "type">
    ) {
        return this.write(
            ScrcpyInjectKeyCodeControlMessage.serialize(
                this.addMessageType(
                    message,
                    ScrcpyControlMessageType.InjectKeyCode
                )
            )
        );
    }

    public injectText(text: string) {
        return this.write(
            ScrcpyInjectTextControlMessage.serialize({
                text,
                type: this.getActualMessageType(
                    ScrcpyControlMessageType.InjectText
                ),
            })
        );
    }

    /**
     * `pressure` is a float value between 0 and 1.
     */
    public injectTouch(message: Omit<ScrcpyInjectTouchControlMessage, "type">) {
        return this.write(
            ScrcpyInjectTouchControlMessage.serialize(
                this.addMessageType(
                    message,
                    ScrcpyControlMessageType.InjectTouch
                )
            )
        );
    }

    /**
     * `scrollX` and `scrollY` are float values between 0 and 1.
     */
    public injectScroll(
        message: Omit<ScrcpyInjectScrollControlMessage, "type">
    ) {
        const data = this.scrollController.serializeScrollMessage(
            this.addMessageType(message, ScrcpyControlMessageType.InjectScroll)
        );

        if (!data) {
            return;
        }

        return this.write(data);
    }

    public async backOrScreenOn(action: AndroidKeyEventAction) {
        const buffer = this.options.serializeBackOrScreenOnControlMessage({
            action,
            type: this.getActualMessageType(
                ScrcpyControlMessageType.BackOrScreenOn
            ),
        });

        if (buffer) {
            return await this.write(buffer);
        }
    }

    public setScreenPowerMode(mode: AndroidScreenPowerMode) {
        return this.write(
            ScrcpySetScreenPowerModeControlMessage.serialize({
                mode,
                type: this.getActualMessageType(
                    ScrcpyControlMessageType.SetScreenPowerMode
                ),
            })
        );
    }

    public rotateDevice() {
        return this.write(
            ScrcpyRotateDeviceControlMessage.serialize({
                type: this.getActualMessageType(
                    ScrcpyControlMessageType.RotateDevice
                ),
            })
        );
    }

    public close() {
        return this.writer.close();
    }
}
