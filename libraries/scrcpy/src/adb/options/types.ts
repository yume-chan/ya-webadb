import type { Adb } from "@yume-chan/adb";
import type { ReadableStream, TransformStream } from "@yume-chan/stream-extra";
import type { ValueOrPromise } from "@yume-chan/struct";

import type {
    ScrcpyBackOrScreenOnControlMessage,
    ScrcpyControlMessageType,
    ScrcpyInjectTouchControlMessage,
    ScrcpySetClipboardControlMessage,
} from "../../control/index.js";
import type {
    ScrcpyOptions,
    ScrcpyVideoStreamMetadata,
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

    public get value(): Required<T> {
        return this.raw.value;
    }
    public set value(value: Required<T>) {
        this.raw.value = value;
    }

    public constructor(raw: ScrcpyOptions<T>) {
        this.raw = raw;
    }

    public getDefaultValues(): Required<T> {
        return this.raw.getDefaultValues();
    }

    public serializeServerArguments(): string[] {
        return this.raw.serializeServerArguments();
    }

    public getOutputEncoderNameRegex(): RegExp {
        return this.raw.getOutputEncoderNameRegex();
    }

    parseVideoStreamMetadata(
        stream: ReadableStream<Uint8Array>
    ): ValueOrPromise<[ReadableStream<Uint8Array>, ScrcpyVideoStreamMetadata]> {
        return this.raw.parseVideoStreamMetadata(stream);
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

    public serializeInjectTouchControlMessage(
        message: ScrcpyInjectTouchControlMessage
    ): Uint8Array {
        return this.raw.serializeInjectTouchControlMessage(message);
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
