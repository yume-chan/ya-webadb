import { Adb } from "@yume-chan/adb";
import Struct, { placeholder } from "@yume-chan/struct";
import { AndroidCodecLevel, AndroidCodecProfile } from "../codec";
import { ScrcpyClientConnection, ScrcpyClientForwardConnection, ScrcpyClientReverseConnection } from "../connection";
import { AndroidKeyEventAction, ScrcpyControlMessageType } from "../message";
import { ScrcpyLogLevel, ScrcpyOptions, ScrcpyScreenOrientation, toScrcpyOption, ToScrcpyOption } from "./common";

export interface CodecOptionsType {
    profile: AndroidCodecProfile;

    level: AndroidCodecLevel;
}

export class CodecOptions implements ToScrcpyOption {
    public value: CodecOptionsType;

    public constructor({
        profile = AndroidCodecProfile.Baseline,
        level = AndroidCodecLevel.Level4,
    }: Partial<CodecOptionsType>) {
        this.value = {
            profile,
            level,
        };
    }

    public toScrcpyOption(): string {
        return Object.entries(this.value)
            .map(([key, value]) => `${key}=${value}`)
            .join(',');
    }
}

export interface ScrcpyOptions1_16Type {
    logLevel: ScrcpyLogLevel;

    /**
     * The maximum value of both width and height.
     */
    maxSize: number;

    bitRate: number;

    maxFps: number;

    /**
     * The orientation of the video stream.
     *
     * It will not keep the device screen in specific orientation,
     * only the captured video will in this orientation.
     */
    lockVideoOrientation: ScrcpyScreenOrientation;

    tunnelForward: boolean;

    // Because Scrcpy 1.21 changed the empty value from '-' to '',
    // We mark properties which can be empty with `| undefined`
    crop: string | undefined;

    sendFrameMeta: boolean;

    control: boolean;

    displayId: number;

    showTouches: boolean;

    stayAwake: boolean;

    codecOptions: CodecOptions | undefined;

    encoderName: string | undefined;
}

export const ScrcpyBackOrScreenOnEvent1_16 =
    new Struct()
        .uint8('type', placeholder<ScrcpyControlMessageType.BackOrScreenOn>());

export class ScrcpyOptions1_16<T extends ScrcpyOptions1_16Type = ScrcpyOptions1_16Type> implements ScrcpyOptions {
    public value: T;

    public constructor({
        logLevel = ScrcpyLogLevel.Error,
        maxSize = 0,
        bitRate = 8_000_000,
        maxFps = 0,
        lockVideoOrientation = ScrcpyScreenOrientation.Unlocked,
        tunnelForward = false,
        crop,
        sendFrameMeta = true,
        control = true,
        displayId = 0,
        showTouches = false,
        stayAwake = true,
        codecOptions,
        encoderName,
    }: Partial<ScrcpyOptions1_16Type>) {
        if (new.target === ScrcpyOptions1_16 &&
            logLevel === ScrcpyLogLevel.Verbose) {
            logLevel = ScrcpyLogLevel.Debug;
        }
        if (new.target === ScrcpyOptions1_16 &&
            lockVideoOrientation === ScrcpyScreenOrientation.Initial) {
            lockVideoOrientation = ScrcpyScreenOrientation.Unlocked;
        }
        this.value = {
            logLevel,
            maxSize,
            bitRate,
            maxFps,
            lockVideoOrientation,
            tunnelForward,
            crop,
            sendFrameMeta,
            control,
            displayId,
            showTouches,
            stayAwake,
            codecOptions,
            encoderName,
        } as T;
    }

    protected getArgumnetOrder(): (keyof T)[] {
        return [
            'logLevel',
            'maxSize',
            'bitRate',
            'maxFps',
            'lockVideoOrientation',
            'tunnelForward',
            'crop',
            'sendFrameMeta',
            'control',
            'displayId',
            'showTouches',
            'stayAwake',
            'codecOptions',
            'encoderName',
        ];
    }

    public formatServerArguments(): string[] {
        return this.getArgumnetOrder().map(key => {
            return toScrcpyOption(this.value[key], '-');
        });
    }

    public formatGetEncoderListArguments(): string[] {
        return this.getArgumnetOrder().map(key => {
            if (key === 'encoderName') {
                // Provide an invalid encoder name
                // So the server will return all available encoders
                return '_';
            }

            return toScrcpyOption(this.value[key], '-');
        });
    }

    public createConnection(device: Adb): ScrcpyClientConnection {
        if (this.value.tunnelForward) {
            return new ScrcpyClientForwardConnection(device);
        } else {
            return new ScrcpyClientReverseConnection(device);
        }
    }

    public getOutputEncoderNameRegex(): RegExp {
        return /^\s+scrcpy --encoder-name '(.*?)'/;
    }

    public createBackOrScreenOnEvent(action: AndroidKeyEventAction, device: Adb) {
        if (action === AndroidKeyEventAction.Down) {
            return ScrcpyBackOrScreenOnEvent1_16.serialize(
                { type: ScrcpyControlMessageType.BackOrScreenOn },
            );
        }

        return undefined;
    }
}
