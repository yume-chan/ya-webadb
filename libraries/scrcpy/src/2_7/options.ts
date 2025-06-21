import type { MaybePromiseLike } from "@yume-chan/async";
import type { ReadableStream, TransformStream } from "@yume-chan/stream-extra";

import type {
    ScrcpyAudioStreamMetadata,
    ScrcpyControlMessageType,
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
    ScrcpyUHidCreateControlMessage,
    ScrcpyUHidOutputDeviceMessage,
} from "../latest.js";

import type { Init } from "./impl/index.js";
import {
    AckClipboardHandler,
    ClipboardStream,
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
    serializeUHidCreateControlMessage,
    setListDisplays,
    setListEncoders,
    UHidOutputStream,
} from "./impl/index.js";

export class ScrcpyOptions2_7<TVideo extends boolean>
    implements ScrcpyOptions<Init<TVideo>>, ScrcpyOptionsListEncoders
{
    static readonly Defaults = Defaults;

    readonly value: Required<Init<TVideo>>;

    get controlMessageTypes(): readonly ScrcpyControlMessageType[] {
        return ControlMessageTypes;
    }

    #clipboard: ClipboardStream | undefined;
    get clipboard(): ReadableStream<string> | undefined {
        return this.#clipboard;
    }

    #ackClipboardHandler: AckClipboardHandler | undefined;

    #uHidOutput: UHidOutputStream | undefined;
    get uHidOutput():
        | ReadableStream<ScrcpyUHidOutputDeviceMessage>
        | undefined {
        return this.#uHidOutput;
    }

    #deviceMessageParsers = new ScrcpyDeviceMessageParsers();
    get deviceMessageParsers() {
        return this.#deviceMessageParsers;
    }

    constructor(init: Init<TVideo>) {
        this.value = { ...Defaults, ...init } as never;

        if (this.value.videoSource === "camera") {
            this.value.control = false;
        }

        if (this.value.audioDup) {
            this.value.audioSource = "playback";
        }

        if (this.value.control) {
            if (this.value.clipboardAutosync) {
                this.#clipboard = this.#deviceMessageParsers.add(
                    new ClipboardStream(),
                );

                this.#ackClipboardHandler = this.#deviceMessageParsers.add(
                    new AckClipboardHandler(),
                );
            }

            this.#uHidOutput = this.#deviceMessageParsers.add(
                new UHidOutputStream(),
            );
        }
    }

    serialize(): string[] {
        return serialize<Init<boolean>>(this.value, Defaults);
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
        return parseVideoStreamMetadata(this.value, stream);
    }

    parseAudioStreamMetadata(
        stream: ReadableStream<Uint8Array>,
    ): MaybePromiseLike<ScrcpyAudioStreamMetadata> {
        return parseAudioStreamMetadata(stream, this.value);
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
        return serializeInjectTouchControlMessage(message);
    }

    serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnControlMessage,
    ): Uint8Array | undefined {
        return serializeBackOrScreenOnControlMessage(message);
    }

    serializeSetClipboardControlMessage(
        message: ScrcpySetClipboardControlMessage,
    ): Uint8Array | [Uint8Array, Promise<void>] {
        return this.#ackClipboardHandler!.serializeSetClipboardControlMessage(
            message,
        );
    }

    createScrollController(): ScrcpyScrollController {
        return createScrollController();
    }

    serializeUHidCreateControlMessage(
        message: ScrcpyUHidCreateControlMessage,
    ): Uint8Array {
        return serializeUHidCreateControlMessage(message);
    }
}

type Init_<TVideo extends boolean> = Init<TVideo>;

export namespace ScrcpyOptions2_7 {
    export type Init<TVideo extends boolean = boolean> = Init_<TVideo>;
}
