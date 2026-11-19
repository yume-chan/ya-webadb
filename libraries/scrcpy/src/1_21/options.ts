import type { MaybePromiseLike } from "@yume-chan/async";
import type { ReadableStream, TransformStream } from "@yume-chan/stream-extra";

import type { ScrcpyDeviceMessageParser } from "../base/device-message.js";
import type {
    MapBoolean,
    ScrcpyDisplay,
    ScrcpyEncoder,
    ScrcpyOptions,
    ScrcpyOptionsListEncoders,
    ScrcpyScrollController,
    ScrcpyVideoStream,
    ScrcpyVideoStreamPacket,
} from "../base/index.js";
import type {
    ScrcpyBackOrScreenOnControlMessage,
    ScrcpyInjectTouchControlMessage,
    ScrcpySetClipboardControlMessage,
    ScrcpySetDisplayPowerControlMessage,
} from "../latest.js";

import type { ComputeOptionTypes, Init } from "./impl/index.js";
import {
    computeOptionValues,
    ControlMessageTypes,
    createMediaStreamTransformer,
    createScrollController,
    Defaults,
    DeviceMessageParser,
    EncoderRegex,
    parseDisplay,
    parseEncoder,
    parseVideoStreamMetadata,
    serialize,
    serializeBackOrScreenOnControlMessage,
    serializeInjectTouchControlMessage,
    serializeSetClipboardControlMessage,
    serializeSetDisplayPowerControlMessage,
    setListDisplays,
    setListEncoders,
} from "./impl/index.js";

export class ScrcpyOptions1_21<TInit extends Init = Init>
    implements
        ScrcpyOptions<ScrcpyOptions1_21.Value<TInit>>,
        ScrcpyOptionsListEncoders
{
    static readonly Defaults = Defaults;

    readonly value: ScrcpyOptions1_21.Value<TInit>;

    get controlMessageTypes(): typeof ControlMessageTypes {
        return ControlMessageTypes;
    }

    constructor(init: TInit) {
        this.value = computeOptionValues(init, Defaults);
    }

    get createDeviceMessageParser(): MapBoolean<
        this["value"]["control"],
        () => DeviceMessageParser<this["value"]>,
        undefined
    > {
        return (this.value.control
            ? () =>
                  new DeviceMessageParser<this["value"]>(
                      this.value.clipboardAutosync,
                      this.value.control,
                  )
            : undefined) satisfies
            (() => DeviceMessageParser<this["value"]>) | undefined as never;
    }

    serialize(): string[] {
        return serialize(this.value, Defaults);
    }

    setListDisplays(): void {
        setListDisplays(this.value);
    }

    parseDisplay(line: string): ScrcpyDisplay | undefined {
        return parseDisplay(line);
    }

    setListEncoders() {
        setListEncoders(this.value);
    }

    parseEncoder(line: string): ScrcpyEncoder | undefined {
        return parseEncoder(line, EncoderRegex);
    }

    parseVideoStreamMetadata(
        stream: ReadableStream<Uint8Array>,
    ): MaybePromiseLike<ScrcpyVideoStream> {
        return parseVideoStreamMetadata(stream);
    }

    createMediaStreamTransformer(): TransformStream<
        Uint8Array,
        ScrcpyVideoStreamPacket
    > {
        return createMediaStreamTransformer(this.value);
    }

    serializeInjectTouchControlMessage(
        message: ScrcpyInjectTouchControlMessage,
    ): Uint8Array {
        if (!this.value.control) {
            throw new Error("control is disabled");
        }
        return serializeInjectTouchControlMessage(message);
    }

    serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnControlMessage,
    ): Uint8Array | undefined {
        if (!this.value.control) {
            throw new Error("control is disabled");
        }
        return serializeBackOrScreenOnControlMessage(message);
    }

    serializeSetClipboardControlMessage(
        message: ScrcpySetClipboardControlMessage,
        deviceMessageParser: ScrcpyDeviceMessageParser,
    ): Uint8Array | [Uint8Array, Promise<void>] {
        if (!this.value.control) {
            throw new Error("control is disabled");
        }
        return serializeSetClipboardControlMessage(
            message,
            deviceMessageParser.ackClipboardHandler,
        );
    }

    serializeSetDisplayPowerControlMessage(
        message: ScrcpySetDisplayPowerControlMessage,
    ): Uint8Array {
        if (!this.value.control) {
            throw new Error("control is disabled");
        }
        return serializeSetDisplayPowerControlMessage(message);
    }

    createScrollController(): ScrcpyScrollController {
        if (!this.value.control) {
            throw new Error("control is disabled");
        }
        return createScrollController();
    }
}

type Init_ = Init;

export namespace ScrcpyOptions1_21 {
    export type Init = Init_;

    export type Value<TInit extends Init> = ComputeOptionTypes<
        TInit,
        typeof Defaults
    >;
}
