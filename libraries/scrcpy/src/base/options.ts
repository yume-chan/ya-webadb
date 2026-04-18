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

export type ScrcpyControlMessageTypeMap = Partial<
    Record<ScrcpyControlMessageType, number>
>;

export interface ScrcpyOptions<T extends object, TDefaults extends object> {
    get controlMessageTypes(): ScrcpyControlMessageTypeMap;

    value: ScrcpyOptionsInitWithDefaults<T, TDefaults>;

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

/**
 * Merge an Init interface with a Defaults object and produce a required
 * type where fields with non-undefined defaults exclude `undefined` from
 * their types.
 */
export type ScrcpyOptionsInitWithDefaults<
    TInit extends object,
    TDefaults extends object,
> = {
    [K in keyof TInit]-?: K extends keyof TDefaults
        ? TDefaults[K] extends undefined
            ? TInit[K]
            : Exclude<TInit[K], undefined>
        : Exclude<TInit[K], undefined>;
};

/**
 * Merge defaults and init values at runtime.
 * For keys present in defaults, use init[key] when it is provided (not undefined),
 * otherwise fall back to defaults[key]. For keys only present in init, keep init[key].
 */
export function mergeDefaults<TInit extends object, TDefaults extends object>(
    defaults: TDefaults,
    init: Partial<TInit>,
): ScrcpyOptionsInitWithDefaults<TInit, TDefaults> {
    const result: Record<string, unknown> = {};

    // Keys from defaults: prefer init[key] when it's not undefined
    for (const key of Object.keys(defaults)) {
        if (
            Object.prototype.hasOwnProperty.call(init, key) &&
            init[key as keyof TInit] !== undefined
        ) {
            result[key] = init[key as keyof TInit];
        } else {
            result[key] = defaults[key as keyof TDefaults];
        }
    }

    // Include keys present only in init
    for (const key of Object.keys(init)) {
        if (!(key in result)) {
            result[key] = init[key as keyof TInit];
        }
    }

    return result as ScrcpyOptionsInitWithDefaults<TInit, TDefaults>;
}
