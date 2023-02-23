import type { Adb } from "@yume-chan/adb";
import type { TransformStream } from "@yume-chan/stream-extra";

import type {
    ScrcpyBackOrScreenOnControlMessage,
    ScrcpyControlMessageType,
    ScrcpySetClipboardControlMessage,
} from "../../control/index.js";
import type {
    ScrcpyOptions,
    ScrcpyVideoStreamPacket,
} from "../../options/index.js";
import type { AdbScrcpyConnection } from "../connection.js";

export interface AdbScrcpyOptions<T extends object> extends ScrcpyOptions<T> {
    createConnection(adb: Adb): AdbScrcpyConnection;
}

export abstract class AdbScrcpyOptionsBase<T extends object>
    implements ScrcpyOptions<T>
{
    private raw: ScrcpyOptions<T>;

    public get value(): Partial<T> {
        return this.raw.value;
    }
    public set value(value: Partial<T>) {
        this.raw.value = value;
    }

    public constructor(raw: ScrcpyOptions<T>) {
        this.raw = raw;
    }

    public getDefaultValue(): T {
        return this.raw.getDefaultValue();
    }

    public formatServerArguments(): string[] {
        return this.raw.formatServerArguments();
    }

    public getOutputEncoderNameRegex(): RegExp {
        return this.raw.getOutputEncoderNameRegex();
    }

    public createVideoStreamTransformer(): TransformStream<
        Uint8Array,
        ScrcpyVideoStreamPacket
    > {
        return this.raw.createVideoStreamTransformer();
    }

    public getControlMessageTypes(): ScrcpyControlMessageType[] {
        return this.raw.getControlMessageTypes();
    }

    public serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnControlMessage
    ): Uint8Array | undefined {
        return this.raw.serializeBackOrScreenOnControlMessage(message);
    }

    public serializeSetClipboardControlMessage(
        message: ScrcpySetClipboardControlMessage
    ): Uint8Array {
        return this.raw.serializeSetClipboardControlMessage(message);
    }

    public getScrollController() {
        return this.raw.getScrollController();
    }

    public abstract createConnection(adb: Adb): AdbScrcpyConnection;
}
