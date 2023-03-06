import type { TransformStream } from "@yume-chan/stream-extra";

import type {
    ScrcpyBackOrScreenOnControlMessage,
    ScrcpyControlMessageType,
    ScrcpySetClipboardControlMessage,
} from "../control/index.js";

import type { ScrcpyScrollController } from "./1_16/scroll.js";

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

export interface ScrcpyVideoStreamConfigurationPacket {
    type: "configuration";
    sequenceParameterSet: Uint8Array;
    pictureParameterSet: Uint8Array;
    data: H264Configuration;
}

export interface ScrcpyVideoStreamFramePacket {
    type: "frame";
    keyframe?: boolean;
    pts?: bigint;
    data: Uint8Array;
}

export type ScrcpyVideoStreamPacket =
    | ScrcpyVideoStreamConfigurationPacket
    | ScrcpyVideoStreamFramePacket;

export interface ScrcpyOptions<T extends object> {
    value: Partial<T>;

    getDefaultValue(): T;

    formatServerArguments(): string[];

    getOutputEncoderNameRegex(): RegExp;

    createVideoStreamTransformer(): TransformStream<
        Uint8Array,
        ScrcpyVideoStreamPacket
    >;

    getControlMessageTypes(): ScrcpyControlMessageType[];

    serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnControlMessage
    ): Uint8Array | undefined;

    serializeSetClipboardControlMessage(
        message: ScrcpySetClipboardControlMessage
    ): Uint8Array;

    getScrollController(): ScrcpyScrollController;
}
