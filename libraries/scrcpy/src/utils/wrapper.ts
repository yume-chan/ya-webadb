import type { MaybePromiseLike } from "@yume-chan/async";
import type { ReadableStream, TransformStream } from "@yume-chan/stream-extra";
import type { AsyncExactReadable } from "@yume-chan/struct";

import type { ScrcpyAudioStreamMetadata } from "../base/audio.js";
import type { ScrcpyEncoder } from "../base/encoder.js";
import type { ScrcpyMediaStreamPacket } from "../base/media.js";
import type { ScrcpyOptions } from "../base/options.js";
import type { ScrcpyScrollController } from "../base/scroll-controller.js";
import type { ScrcpyVideoStream } from "../base/video.js";
import type {
    ScrcpyBackOrScreenOnControlMessage,
    ScrcpyInjectTouchControlMessage,
    ScrcpySetClipboardControlMessage,
    ScrcpyUHidCreateControlMessage,
} from "../latest.js";

export class ScrcpyOptionsWrapper<T extends object>
    implements ScrcpyOptions<T>
{
    #base: ScrcpyOptions<T>;

    get version() {
        return this.#base.version;
    }

    get controlMessageTypes() {
        return this.#base.controlMessageTypes;
    }

    get value() {
        return this.#base.value;
    }

    get clipboard() {
        return this.#base.clipboard;
    }

    get uHidOutput() {
        return this.#base.uHidOutput;
    }

    constructor(options: ScrcpyOptions<T>) {
        this.#base = options;
    }

    serialize(): string[] {
        return this.#base.serialize();
    }

    setListDisplays() {
        this.#base.setListDisplays();
    }

    parseDisplay(line: string) {
        return this.#base.parseDisplay(line);
    }

    setListEncoders(): void {
        if (!this.#base.setListEncoders) {
            throw new Error("setListEncoders is not implemented");
        }
        this.#base.setListEncoders();
    }

    parseEncoder(line: string): ScrcpyEncoder | undefined {
        if (!this.#base.parseEncoder) {
            throw new Error("parseEncoder is not implemented");
        }
        return this.#base.parseEncoder(line);
    }

    parseVideoStreamMetadata(
        stream: ReadableStream<Uint8Array>,
    ): MaybePromiseLike<ScrcpyVideoStream> {
        return this.#base.parseVideoStreamMetadata(stream);
    }

    parseAudioStreamMetadata(
        stream: ReadableStream<Uint8Array>,
    ): MaybePromiseLike<ScrcpyAudioStreamMetadata> {
        if (!this.#base.parseAudioStreamMetadata) {
            throw new Error("parseAudioStreamMetadata is not implemented");
        }
        return this.#base.parseAudioStreamMetadata(stream);
    }

    parseDeviceMessage(id: number, stream: AsyncExactReadable): Promise<void> {
        return this.#base.parseDeviceMessage(id, stream);
    }

    endDeviceMessageStream(e?: unknown): void {
        this.#base.endDeviceMessageStream(e);
    }

    createMediaStreamTransformer(): TransformStream<
        Uint8Array,
        ScrcpyMediaStreamPacket
    > {
        return this.#base.createMediaStreamTransformer();
    }

    serializeInjectTouchControlMessage(
        message: ScrcpyInjectTouchControlMessage,
    ): Uint8Array {
        return this.#base.serializeInjectTouchControlMessage(message);
    }

    serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnControlMessage,
    ): Uint8Array | undefined {
        return this.#base.serializeBackOrScreenOnControlMessage(message);
    }

    serializeSetClipboardControlMessage(
        message: ScrcpySetClipboardControlMessage,
    ): Uint8Array | [Uint8Array, Promise<void>] {
        return this.#base.serializeSetClipboardControlMessage(message);
    }

    createScrollController(): ScrcpyScrollController {
        return this.#base.createScrollController();
    }

    serializeUHidCreateControlMessage(
        message: ScrcpyUHidCreateControlMessage,
    ): Uint8Array {
        if (!this.#base.serializeUHidCreateControlMessage) {
            throw new Error(
                "serializeUHidCreateControlMessage is not implemented",
            );
        }
        return this.#base.serializeUHidCreateControlMessage(message);
    }
}
