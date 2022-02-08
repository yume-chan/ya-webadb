import type { Adb, AdbBufferedStream } from "@yume-chan/adb";
import type { ScrcpyClientConnection } from "../connection";
import type { H264EncodingInfo } from "../decoder";
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

export interface VideoStreamPacket {
    encodingInfo?: H264EncodingInfo | undefined;

    videoData?: ArrayBuffer | undefined;
}

export interface ScrcpyOptions<T> {
    value: Partial<T>;

    formatServerArguments(): string[];

    getOutputEncoderNameRegex(): RegExp;

    createConnection(device: Adb): ScrcpyClientConnection;

    parseVideoStream(stream: AdbBufferedStream): Promise<VideoStreamPacket>;

    serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnEvent1_18,
    ): ArrayBuffer | undefined;

    serializeInjectScrollControlMessage(
        message: ScrcpyInjectScrollControlMessage1_22,
    ): ArrayBuffer;
}
