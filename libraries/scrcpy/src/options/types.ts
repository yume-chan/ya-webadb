import type { TransformStream } from '@yume-chan/stream-extra';

import type { ScrcpyControlMessageType } from '../control/index.js';
import type { H264Configuration } from '../decoder/index.js';
import type { ScrcpyBackOrScreenOnControlMessage1_18 } from './1_18.js';
import type { ScrcpyInjectScrollControlMessage1_22 } from './1_22.js';

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
    keyframe?: boolean | undefined;
    pts?: bigint | undefined;
    data: Uint8Array;
}

export type VideoStreamPacket = VideoStreamConfigurationPacket | VideoStreamFramePacket;

export interface ScrcpyOptions<T> {
    value: Partial<T>;

    getDefaultValue(): T;

    formatServerArguments(): string[];

    getOutputEncoderNameRegex(): RegExp;

    createVideoStreamTransformer(): TransformStream<Uint8Array, VideoStreamPacket>;

    getControlMessageTypes(): ScrcpyControlMessageType[];

    serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnControlMessage1_18,
    ): Uint8Array | undefined;

    serializeInjectScrollControlMessage(
        message: ScrcpyInjectScrollControlMessage1_22,
    ): Uint8Array;
}
