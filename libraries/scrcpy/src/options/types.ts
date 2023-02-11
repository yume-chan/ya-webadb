import {
    type ReadableStream,
    type TransformStream,
} from "@yume-chan/stream-extra";
import { type ValueOrPromise } from "@yume-chan/struct";

import {
    type ScrcpyBackOrScreenOnControlMessage,
    type ScrcpyControlMessageType,
    type ScrcpyInjectTouchControlMessage,
    type ScrcpySetClipboardControlMessage,
} from "../control/index.js";

import { type ScrcpyScrollController } from "./1_16/scroll.js";

export const DEFAULT_SERVER_PATH = "/data/local/tmp/scrcpy-server.jar";

export interface ScrcpyOptionValue {
    toOptionValue(): string | undefined;
}

export function isScrcpyOptionValue(
    value: unknown
): value is ScrcpyOptionValue {
    return (
        typeof value === "object" &&
        value !== null &&
        "toOptionValue" in value &&
        typeof value.toOptionValue === "function"
    );
}

export function toScrcpyOptionValue<T>(value: unknown, empty: T): string | T {
    if (isScrcpyOptionValue(value)) {
        value = value.toOptionValue();
    }

    // `value` may become `undefined` after `toOptionValue`
    if (value === undefined) {
        return empty;
    }

    return String(value);
}

export interface H264Configuration {
    profileIndex: number;
    constraintSet: number;
    levelIndex: number;

    encodedWidth: number;
    encodedHeight: number;

    cropLeft: number;
    cropRight: number;

    cropTop: number;
    cropBottom: number;

    croppedWidth: number;
    croppedHeight: number;
}

export enum ScrcpyVideoCodecId {
    H264 = 0x68_32_36_34,
    H265 = 0x68_32_36_35,
    AV1 = 0x00_61_76_31,
}

export interface ScrcpyVideoStreamMetadata {
    deviceName?: string;
    width?: number;
    height?: number;
    codec?: ScrcpyVideoCodecId;
}

export interface ScrcpyVideoStreamConfigurationPacket {
    type: "configuration";
    sequenceParameterSet: Uint8Array;
    pictureParameterSet: Uint8Array;
    data: H264Configuration;
}

export interface ScrcpyVideoStreamFramePacket {
    type: "frame";
    keyframe?: boolean | undefined;
    pts?: bigint | undefined;
    data: Uint8Array;
}

export type ScrcpyVideoStreamPacket =
    | ScrcpyVideoStreamConfigurationPacket
    | ScrcpyVideoStreamFramePacket;

export interface ScrcpyOptions<T extends object> {
    value: Partial<T>;

    getDefaultValue(): T;

    serializeServerArguments(): string[];

    getOutputEncoderNameRegex(): RegExp;

    parseVideoStreamMetadata(
        stream: ReadableStream<Uint8Array>
    ): ValueOrPromise<[ReadableStream<Uint8Array>, ScrcpyVideoStreamMetadata]>;

    createVideoStreamTransformer(): TransformStream<
        Uint8Array,
        ScrcpyVideoStreamPacket
    >;

    getControlMessageTypes(): ScrcpyControlMessageType[];

    serializeInjectTouchControlMessage(
        message: ScrcpyInjectTouchControlMessage
    ): Uint8Array;

    serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnControlMessage
    ): Uint8Array | undefined;

    serializeSetClipboardControlMessage(
        message: ScrcpySetClipboardControlMessage
    ): Uint8Array;

    getScrollController(): ScrcpyScrollController;
}
