import type { Adb, AdbBufferedStream, ReadableStream } from "@yume-chan/adb";
import type { ScrcpyClientConnection } from "../connection";
import type { H264Configuration } from "../decoder";
import type { ScrcpyBackOrScreenOnEvent1_18 } from "./1_18";
import type { ScrcpyInjectScrollControlMessage1_22 } from "./1_22";

export const DEFAULT_SERVER_PATH = '/data/local/tmp/scrcpy-server.jar';

export interface ScrcpyOptionValue {
    toOptionValue(): string | undefined;
}

export function isScrcpyOptionValue(value: any): value is ScrcpyOptionValue {
    return typeof value === 'object' &&
        value !== null &&
        typeof value.toOptionValue === 'function';
}

export function toScrcpyOptionValue<T>(value: any, empty: T): string | T {
    if (isScrcpyOptionValue(value)) {
        value = value.toOptionValue();
    }

    if (value === undefined) {
        return empty;
    }

    return `${value}`;
}

export interface VideoStreamConfigurationPacket {
    type: 'configuration';
    data: H264Configuration;
}

export interface VideoStreamFramePacket {
    type: 'frame';
    data: Uint8Array;
}

export type VideoStreamPacket = VideoStreamConfigurationPacket | VideoStreamFramePacket;

export interface ScrcpyOptions<T> {
    value: Partial<T>;

    formatServerArguments(): string[];

    getOutputEncoderNameRegex(): RegExp;

    createConnection(adb: Adb): ScrcpyClientConnection;

    parseVideoStream(stream: AdbBufferedStream): ReadableStream<VideoStreamPacket>;

    serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnEvent1_18,
    ): Uint8Array | undefined;

    serializeInjectScrollControlMessage(
        message: ScrcpyInjectScrollControlMessage1_22,
    ): Uint8Array;
}
