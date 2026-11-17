import type { MaybePromiseLike } from "@yume-chan/async";
import type {
    Consumable,
    ReadableStream,
    TransformStream,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";

import type { ScrcpyDeviceMessageParser } from "../base/device-message.js";
import type {
    MapBoolean,
    ScrcpyAudioStreamMetadata,
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
    ScrcpyUHidCreateControlMessage,
} from "../latest.js";

import type { ComputeOptionTypes, Init } from "./impl/index.js";
import {
    computeOptionValues,
    ControlMessageTypes,
    createMediaStreamTransformer,
    createScrollController,
    Defaults,
    DeviceMessageParser,
    parseAudioCodecOption,
    parseAudioMetadataCodec,
    parseAudioStreamMetadata,
    parseDisplay,
    parseEncoder,
    parseVideoCodecOption,
    parseVideoStreamMetadata,
    parseVideoStreamMetadataAsync,
    serialize,
    serializeBackOrScreenOnControlMessage,
    serializeInjectTouchControlMessage,
    serializeSetClipboardControlMessage,
    serializeSetDisplayPowerControlMessage,
    serializeUHidCreateControlMessage,
    setListDisplays,
    setListEncoders,
    UHidManager,
} from "./impl/index.js";

export class ScrcpyOptions2_7<TInit extends Init = Init>
    implements
        ScrcpyOptions<ScrcpyOptions2_7.Value<TInit>>,
        ScrcpyOptionsListEncoders
{
    static readonly Defaults = Defaults;

    readonly value: ScrcpyOptions2_7.Value<TInit>;

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
        return parseEncoder(line);
    }

    parseVideoStreamMetadata(
        stream: ReadableStream<Uint8Array>,
    ): MaybePromiseLike<ScrcpyVideoStream> {
        return parseVideoStreamMetadata(
            stream,
            this.value.sendDeviceMeta,
            this.value.sendCodecMeta,
            parseVideoCodecOption(this.value.videoCodec),
            parseVideoStreamMetadataAsync,
        );
    }

    parseAudioStreamMetadata(
        stream: ReadableStream<Uint8Array>,
    ): MaybePromiseLike<ScrcpyAudioStreamMetadata> {
        return parseAudioStreamMetadata(
            stream,
            this.value.sendCodecMeta,
            parseAudioMetadataCodec,
            parseAudioCodecOption(this.value.audioCodec),
        );
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

    createScrollController(): ScrcpyScrollController {
        if (!this.value.control) {
            throw new Error("control is disabled");
        }
        return createScrollController();
    }

    serializeSetDisplayPowerControlMessage(
        message: ScrcpySetDisplayPowerControlMessage,
    ): Uint8Array {
        if (!this.value.control) {
            throw new Error("control is disabled");
        }
        return serializeSetDisplayPowerControlMessage(message);
    }

    serializeUHidCreateControlMessage(
        message: ScrcpyUHidCreateControlMessage,
    ): Uint8Array {
        if (!this.value.control) {
            throw new Error("control is disabled");
        }
        return serializeUHidCreateControlMessage(message);
    }

    get createUHidManager(): MapBoolean<
        this["value"]["control"],
        (
            writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>,
            deviceMessageParser: ScrcpyDeviceMessageParser,
        ) => UHidManager<this["value"]>,
        undefined
    > {
        return (this.value.control
            ? (
                  writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>,
                  deviceMessageParser: DeviceMessageParser<this["value"]>,
              ) => new UHidManager(writer, this, deviceMessageParser)
            : undefined) satisfies
            | ((
                  writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>,
                  deviceMessageParser: DeviceMessageParser<this["value"]>,
              ) => UHidManager<this["value"]>)
            | undefined as never;
    }
}

type Init_ = Init;

export namespace ScrcpyOptions2_7 {
    export type Init = Init_;

    export type Value<TInit extends Init> = ComputeOptionTypes<
        TInit,
        typeof Defaults
    >;
}
