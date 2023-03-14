import type { ReadableStream, TransformStream } from "@yume-chan/stream-extra";
import type { ValueOrPromise } from "@yume-chan/struct";

import type {
    ScrcpyBackOrScreenOnControlMessage,
    ScrcpyControlMessageType,
    ScrcpyInjectTouchControlMessage,
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

export enum ScrcpyVideoCodecId {
    H264 = 0x68_32_36_34,
    H265 = 0x68_32_36_35,
    AV1 = 0x00_61_76_31,
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
    keyframe?: boolean;
    pts?: bigint;
    data: Uint8Array;
}

export type ScrcpyVideoStreamPacket =
    | ScrcpyVideoStreamConfigurationPacket
    | ScrcpyVideoStreamFramePacket;

export enum ScrcpyAudioCodecId {
    Opus = 0x6f_70_75_73,
    Aac = 0x00_61_61_63,
    Raw = 0x00_72_61_77,
    Disabled = 0x00_00_00_00,
    Errored = 0x00_00_00_01,
}

export interface ScrcpyAudioStreamMetadata {
    codec?: ScrcpyAudioCodecId;
}

export interface ScrcpyOptions<T extends object> {
    readonly controlMessageTypes: readonly ScrcpyControlMessageType[];

    value: Required<T>;

    getDefaults(): Required<T>;

    serialize(): string[];

    parseEncoder(line: string): ScrcpyEncoder | undefined;

    /**
     * Parse the device metadata from video stream according to the current version and options.
     * @param stream The video stream.
     * @returns
     * A tuple of the video stream and the metadata.
     *
     * The returned video stream may be different from the input stream, and should be used for further processing.
     */
    parseVideoStreamMetadata(
        stream: ReadableStream<Uint8Array>
    ): ValueOrPromise<[ReadableStream<Uint8Array>, ScrcpyVideoStreamMetadata]>;

    createVideoStreamTransformer(): TransformStream<
        Uint8Array,
        ScrcpyVideoStreamPacket
    >;

    serializeInjectTouchControlMessage(
        message: ScrcpyInjectTouchControlMessage
    ): Uint8Array;

    serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnControlMessage
    ): Uint8Array | undefined;

    serializeSetClipboardControlMessage(
        message: ScrcpySetClipboardControlMessage
    ): Uint8Array;

    createScrollController(): ScrcpyScrollController;
}

export interface ScrcpyEncoder {
    codec?: string;
    name: string;
}

export abstract class ScrcpyOptionsBase<
    T extends object,
    B extends ScrcpyOptions<object>
> implements ScrcpyOptions<T>
{
    protected _base: B;

    private _value: Required<T>;
    public get value(): Required<T> {
        return this._value;
    }
    public set value(value: Required<T>) {
        this._value = value;
    }

    public get controlMessageTypes(): readonly ScrcpyControlMessageType[] {
        return this._base.controlMessageTypes;
    }

    public constructor(base: B, value: Required<T>) {
        this._base = base;
        this._value = value;
    }

    public abstract getDefaults(): Required<T>;

    public abstract serialize(): string[];

    public parseEncoder(line: string): ScrcpyEncoder | undefined {
        return this._base.parseEncoder(line);
    }

    /**
     * Parse the device metadata from video stream according to the current version and options.
     * @param stream The video stream.
     * @returns
     * A tuple of the video stream and the metadata.
     *
     * The returned video stream may be different from the input stream, and should be used for further processing.
     */
    public parseVideoStreamMetadata(
        stream: ReadableStream<Uint8Array>
    ): ValueOrPromise<[ReadableStream<Uint8Array>, ScrcpyVideoStreamMetadata]> {
        return this._base.parseVideoStreamMetadata(stream);
    }

    public createVideoStreamTransformer(): TransformStream<
        Uint8Array,
        ScrcpyVideoStreamPacket
    > {
        return this._base.createVideoStreamTransformer();
    }

    public serializeInjectTouchControlMessage(
        message: ScrcpyInjectTouchControlMessage
    ): Uint8Array {
        return this._base.serializeInjectTouchControlMessage(message);
    }

    public serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnControlMessage
    ): Uint8Array | undefined {
        return this._base.serializeBackOrScreenOnControlMessage(message);
    }

    public serializeSetClipboardControlMessage(
        message: ScrcpySetClipboardControlMessage
    ): Uint8Array {
        return this._base.serializeSetClipboardControlMessage(message);
    }

    public createScrollController(): ScrcpyScrollController {
        return this._base.createScrollController();
    }
}
