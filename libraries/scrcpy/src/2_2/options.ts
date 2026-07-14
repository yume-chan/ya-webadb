import type { MaybePromiseLike } from "@yume-chan/async";
import type { ReadableStream, TransformStream } from "@yume-chan/stream-extra";

import type {
    MapBoolean,
    ScrcpyAudioStreamMetadata,
    ScrcpyDisplay,
    ScrcpyEncoder,
    ScrcpyMediaStreamPacket,
    ScrcpyOptions,
    ScrcpyOptionsListEncoders,
    ScrcpyScrollController,
    ScrcpyVideoStream,
} from "../base/index.js";
import { ScrcpyDeviceMessageParsers } from "../base/index.js";
import type {
    ScrcpyBackOrScreenOnControlMessage,
    ScrcpyInjectTouchControlMessage,
    ScrcpySetClipboardControlMessage,
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
    setListDisplays,
    setListEncoders,
} from "./impl/index.js";

export class ScrcpyOptions2_2<TInit extends Init = Init>
    implements
        ScrcpyOptions<ScrcpyOptions2_2.Value<TInit>>,
        ScrcpyOptionsListEncoders
{
    static readonly Defaults = Defaults;

    readonly value: ScrcpyOptions2_2.Value<TInit>;

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
            this.value.sendCodecMeta as never,
            this.value.videoCodec as never,
        );
    }

    parseAudioStreamMetadata(
        stream: ReadableStream<Uint8Array>,
    ): MaybePromiseLike<ScrcpyAudioStreamMetadata> {
        return parseAudioStreamMetadata(
            stream,
            this.value.sendCodecMeta as never,
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
}

type Init_ = Init;

export namespace ScrcpyOptions2_2 {
    export type Init = Init_;

    export type Value<TInit extends Init> = ComputeOptionTypes<
        TInit,
        typeof Defaults
    >;
}
