import type { MaybePromiseLike } from "@yume-chan/async";
import type { ReadableStream, TransformStream } from "@yume-chan/stream-extra";

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
import { ScrcpyDeviceMessageParsers } from "../base/index.js";
import type {
    ScrcpyBackOrScreenOnControlMessage,
    ScrcpyInjectTouchControlMessage,
    ScrcpySetClipboardControlMessage,
    ScrcpySetDisplayPowerControlMessage,
    ScrcpyUHidCreateControlMessage,
    ScrcpyUHidOutputDeviceMessage,
} from "../latest.js";

import type { ComputeOptionTypes, Init } from "./impl/index.js";
import {
    AckClipboardHandler,
    ClipboardStream,
    computeOptionValues,
    ControlMessageTypes,
    createMediaStreamTransformer,
    createScrollController,
    Defaults,
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
    UHidOutputStream,
} from "./impl/index.js";

export class ScrcpyOptions3_0<TInit extends Init = Init>
    implements
        ScrcpyOptions<ScrcpyOptions3_0.Value<TInit>>,
        ScrcpyOptionsListEncoders
{
    static readonly Defaults = Defaults;

    readonly value: ScrcpyOptions3_0.Value<TInit>;

    get controlMessageTypes(): typeof ControlMessageTypes {
        return ControlMessageTypes;
    }

    #clipboard: ClipboardStream | undefined;
    get clipboard(): MapBoolean<
        this["value"]["clipboardAutosync"],
        ReadableStream<string>,
        undefined
    > {
        return this.#clipboard as never;
    }

    #ackClipboardHandler: AckClipboardHandler | undefined;

    #uHidOutput: UHidOutputStream | undefined;
    get uHidOutput(): MapBoolean<
        this["value"]["control"],
        ReadableStream<ScrcpyUHidOutputDeviceMessage>,
        undefined
    > {
        return this.#uHidOutput as never;
    }

    #deviceMessageParsers = new ScrcpyDeviceMessageParsers();
    get deviceMessageParsers() {
        return this.#deviceMessageParsers;
    }

    constructor(init: TInit) {
        this.value = computeOptionValues(init, Defaults);

        if (this.value.control) {
            if (this.value.clipboardAutosync) {
                this.#clipboard = this.#deviceMessageParsers.add(
                    new ClipboardStream(),
                );
            }

            this.#ackClipboardHandler = this.#deviceMessageParsers.add(
                new AckClipboardHandler(),
            );

            this.#uHidOutput = this.#deviceMessageParsers.add(
                new UHidOutputStream(),
            );
        }
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
            this.value.sendDeviceMeta!,
            this.value.sendCodecMeta!,
            parseVideoCodecOption(this.value.videoCodec!),
            parseVideoStreamMetadataAsync,
        );
    }

    parseAudioStreamMetadata(
        stream: ReadableStream<Uint8Array>,
    ): MaybePromiseLike<ScrcpyAudioStreamMetadata> {
        return parseAudioStreamMetadata(
            stream,
            this.value.sendCodecMeta!,
            parseAudioMetadataCodec,
            parseAudioCodecOption(this.value.audioCodec!),
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
    ): Uint8Array | [Uint8Array, Promise<void>] {
        if (!this.value.control) {
            throw new Error("control is disabled");
        }
        return serializeSetClipboardControlMessage(
            message,
            this.#ackClipboardHandler,
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

    serializeUHidCreateControlMessage(
        message: ScrcpyUHidCreateControlMessage,
    ): Uint8Array {
        if (!this.value.control) {
            throw new Error("control is disabled");
        }
        return serializeUHidCreateControlMessage(message);
    }
}

type Init_ = Init;

export namespace ScrcpyOptions3_0 {
    export type Init = Init_;

    export type Value<TInit extends Init> = ComputeOptionTypes<
        TInit,
        typeof Defaults
    >;
}
