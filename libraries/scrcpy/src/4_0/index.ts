import type { MaybePromiseLike } from "@yume-chan/async";
import type { ReadableStream, TransformStream } from "@yume-chan/stream-extra";

import type { ScrcpyAudioStreamMetadata } from "../base/audio.js";
import { ScrcpyDeviceMessageParsers } from "../base/device-message.js";
import type { ScrcpyDisplay } from "../base/display.js";
import type { ScrcpyEncoder } from "../base/encoder.js";
import type { ScrcpyMediaStreamPacket } from "../base/media.js";
import type {
    MapBoolean,
    ScrcpyOptions,
    ScrcpyOptionsListEncoders,
} from "../base/options.js";
import type { ScrcpyScrollController } from "../base/scroll-controller.js";
import type { ScrcpyVideoStream } from "../base/video.js";
import type {
    ScrcpyBackOrScreenOnControlMessage,
    ScrcpyInjectTouchControlMessage,
    ScrcpySetClipboardControlMessage,
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
    parseAudioStreamMetadata,
    parseDisplay,
    parseEncoder,
    parseVideoStreamMetadata,
    serialize,
    serializeBackOrScreenOnControlMessage,
    serializeInjectTouchControlMessage,
    serializeSetClipboardControlMessage,
    serializeUHidCreateControlMessage,
    setListDisplays,
    setListEncoders,
    UHidOutputStream,
} from "./impl/index.js";

export class ScrcpyOptions4_0<TInit extends Init = Init>
    implements
        ScrcpyOptions<ComputeOptionTypes<TInit, typeof Defaults>>,
        ScrcpyOptionsListEncoders
{
    static readonly Defaults = Defaults;

    readonly value: ComputeOptionTypes<TInit, typeof Defaults>;

    get controlMessageTypes(): typeof ControlMessageTypes {
        return ControlMessageTypes;
    }

    #clipboard: ClipboardStream | undefined;
    get clipboard(): MapBoolean<
        this["value"]["control"],
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
            this.value.sendDeviceMeta as never,
            this.value.sendStreamMeta as never,
            this.value.videoCodec as never,
        );
    }

    parseAudioStreamMetadata(
        stream: ReadableStream<Uint8Array>,
    ): MaybePromiseLike<ScrcpyAudioStreamMetadata> {
        return parseAudioStreamMetadata(
            stream,
            this.value.sendStreamMeta as never,
            this.value.audioCodec as never,
        );
    }

    createMediaStreamTransformer(): TransformStream<
        Uint8Array,
        ScrcpyMediaStreamPacket
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
