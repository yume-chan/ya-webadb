import type { MaybePromiseLike } from "@yume-chan/async";
import type { ReadableStream, TransformStream } from "@yume-chan/stream-extra";
import type { AsyncExactReadable } from "@yume-chan/struct";

import type {
    ScrcpyAudioStreamMetadata,
    ScrcpyControlMessageType,
    ScrcpyDisplay,
    ScrcpyEncoder,
    ScrcpyMediaStreamPacket,
    ScrcpyOptions,
    ScrcpyScrollController,
    ScrcpyVideoStream,
} from "../base/index.js";
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

export class ScrcpyOptions3_0 implements ScrcpyOptions<Init> {
    static readonly Defaults = Defaults;

    readonly version: string;

    readonly value: Required<Init>;

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

    constructor(init: Init, version = "3.0") {
        this.value = { ...Defaults, ...init };
        this.version = version;

        if (this.value.videoSource === "camera") {
            this.value.control = false;
        }

        if (this.value.audioDup) {
            this.value.audioSource = "playback";
        }

        if (this.value.control) {
            if (this.value.clipboardAutosync) {
                this.#clipboard = new ClipboardStream();
                this.#ackClipboardHandler = new AckClipboardHandler();
            }

            this.#uHidOutput = new UHidOutputStream();
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
        return parseVideoStreamMetadata(this.value, stream);
    }

    parseAudioStreamMetadata(
        stream: ReadableStream<Uint8Array>,
    ): MaybePromiseLike<ScrcpyAudioStreamMetadata> {
        return parseAudioStreamMetadata(stream, this.value);
    }

    async parseDeviceMessage(
        id: number,
        stream: AsyncExactReadable,
    ): Promise<void> {
        if (await this.#clipboard?.parse(id, stream)) {
            return;
        }

        if (await this.#ackClipboardHandler?.parse(id, stream)) {
            return;
        }

        throw new Error("Unknown device message");
    }

    endDeviceMessageStream(e?: unknown): void {
        if (e) {
            this.#clipboard?.error(e);
            this.#ackClipboardHandler?.error(e);
        } else {
            this.#clipboard?.close();
            this.#ackClipboardHandler?.close();
        }
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

type Init_ = Init;

export namespace ScrcpyOptions3_0 {
    export type Init = Init_;
}
