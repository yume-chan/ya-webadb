import type { Adb } from '@yume-chan/adb';
import type { TransformStream } from '@yume-chan/stream-extra';

import type { ScrcpyControlMessageType } from '../../control/index.js';
import type { ScrcpyBackOrScreenOnEvent1_18, ScrcpyInjectScrollControlMessage1_22, ScrcpyOptions, VideoStreamPacket } from '../../options/index.js';
import type { AdbScrcpyConnection } from '../connection.js';

export interface AdbScrcpyOptions<T> extends ScrcpyOptions<T> {
    createConnection(adb: Adb): AdbScrcpyConnection;
}

export abstract class AdbScrcpyOptionsBase<T> implements ScrcpyOptions<T> {
    private raw: ScrcpyOptions<T>;

    public get value(): Partial<T> { return this.raw.value; }
    public set value(value: Partial<T>) { this.raw.value = value; }

    public constructor(raw: ScrcpyOptions<T>) {
        this.raw = raw;
    }

    public getDefaultValue(): T {
        return this.raw.getDefaultValue();
    }

    public formatServerArguments(): string[] {
        return this.raw.formatServerArguments();
    }

    public getOutputEncoderNameRegex(): RegExp {
        return this.raw.getOutputEncoderNameRegex();
    }

    public createVideoStreamTransformer(): TransformStream<Uint8Array, VideoStreamPacket> {
        return this.raw.createVideoStreamTransformer();
    }

    public getControlMessageTypes(): ScrcpyControlMessageType[] {
        return this.raw.getControlMessageTypes();
    }

    public serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnEvent1_18,
    ): Uint8Array | undefined {
        return this.raw.serializeBackOrScreenOnControlMessage(message);
    }

    public serializeInjectScrollControlMessage(
        message: ScrcpyInjectScrollControlMessage1_22,
    ): Uint8Array {
        return this.raw.serializeInjectScrollControlMessage(message);
    }

    public abstract createConnection(adb: Adb): AdbScrcpyConnection;
}
