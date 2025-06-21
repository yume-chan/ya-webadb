import type { MaybePromiseLike } from "@yume-chan/async";
import type { ReadableStream, TransformStream } from "@yume-chan/stream-extra";

import type {
    ScrcpyBackOrScreenOnControlMessage,
    ScrcpyInjectTouchControlMessage,
    ScrcpySetClipboardControlMessage,
    ScrcpyUHidCreateControlMessage,
    ScrcpyUHidOutputDeviceMessage,
} from "../latest.js";

import type { ScrcpyAudioStreamMetadata } from "./audio.js";
import type { ScrcpyControlMessageType } from "./control-message-type.js";
import type { ScrcpyDeviceMessageParsers } from "./device-message.js";
import type { ScrcpyDisplay } from "./display.js";
import type { ScrcpyEncoder } from "./encoder.js";
import type { ScrcpyMediaStreamPacket } from "./media.js";
import type { ScrcpyScrollController } from "./scroll-controller.js";
import type { ScrcpyVideoStream } from "./video.js";

export interface ScrcpyOptions<T extends object> {
    get controlMessageTypes(): readonly ScrcpyControlMessageType[];

    value: Required<T>;

    readonly clipboard?: ReadableStream<string> | undefined;

    readonly uHidOutput?:
        | ReadableStream<ScrcpyUHidOutputDeviceMessage>
        | undefined;

    readonly deviceMessageParsers: ScrcpyDeviceMessageParsers;

    serialize(): string[];

    setListDisplays(): void;

    parseDisplay(line: string): ScrcpyDisplay | undefined;

    parseVideoStreamMetadata(
        stream: ReadableStream<Uint8Array>,
    ): MaybePromiseLike<ScrcpyVideoStream>;

    parseAudioStreamMetadata?(
        stream: ReadableStream<Uint8Array>,
    ): MaybePromiseLike<ScrcpyAudioStreamMetadata>;

    createMediaStreamTransformer(): TransformStream<
        Uint8Array,
        ScrcpyMediaStreamPacket
    >;

    serializeInjectTouchControlMessage(
        message: ScrcpyInjectTouchControlMessage,
    ): Uint8Array;

    serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnControlMessage,
    ): Uint8Array | undefined;

    serializeSetClipboardControlMessage(
        message: ScrcpySetClipboardControlMessage,
    ): Uint8Array | [Uint8Array, Promise<void>];

    createScrollController(): ScrcpyScrollController;

    serializeUHidCreateControlMessage?(
        message: ScrcpyUHidCreateControlMessage,
    ): Uint8Array;
}

export interface ScrcpyOptionsListEncoders {
    setListEncoders(): void;

    parseEncoder(line: string): ScrcpyEncoder | undefined;
}
