import { StructDeserializeStream, TransformStream, type Adb } from "@yume-chan/adb";
import Struct from "@yume-chan/struct";
import type { AndroidCodecLevel, AndroidCodecProfile } from "../../codec.js";
import { ScrcpyClientConnection, ScrcpyClientForwardConnection, ScrcpyClientReverseConnection, type ScrcpyClientConnectionOptions } from "../../connection.js";
import { AndroidKeyEventAction, ScrcpyControlMessageType, ScrcpySimpleControlMessage } from "../../message.js";
import type { ScrcpyBackOrScreenOnEvent1_18 } from "../1_18.js";
import type { ScrcpyInjectScrollControlMessage1_22 } from "../1_22.js";
import { toScrcpyOptionValue, type ScrcpyOptions, type ScrcpyOptionValue, type VideoStreamPacket } from "../common.js";
import { parse_sequence_parameter_set } from "./sps.js";

export enum ScrcpyLogLevel {
    Verbose = 'verbose',
    Debug = 'debug',
    Info = 'info',
    Warn = 'warn',
    Error = 'error',
}

export enum ScrcpyVideoOrientation {
    Initial = -2,
    Unlocked = -1,
    Portrait = 0,
    Landscape = 1,
    PortraitFlipped = 2,
    LandscapeFlipped = 3,
}

export interface CodecOptionsInit {
    profile: AndroidCodecProfile;
    level: AndroidCodecLevel;

    iFrameInterval: number;
    repeatPreviousFrameAfter: number;
    maxPtsGapToEncoder: number;
}

function toDashCase(input: string) {
    return input.replace(/([A-Z])/g, '-$1').toLowerCase();
}

const CODEC_OPTION_TYPES: Partial<Record<keyof CodecOptionsInit, 'long' | 'float' | 'string'>> = {
    repeatPreviousFrameAfter: 'long',
    maxPtsGapToEncoder: 'long',
};

export class CodecOptions implements ScrcpyOptionValue {
    public value: Partial<CodecOptionsInit>;

    public constructor(value: Partial<CodecOptionsInit>) {
        this.value = value;
    }

    public toOptionValue(): string | undefined {
        const entries = Object.entries(this.value)
            .filter(([key, value]) => value !== undefined);

        if (entries.length === 0) {
            return undefined;
        }

        return entries
            .map(([key, value]) => {
                const type = CODEC_OPTION_TYPES[key as keyof CodecOptionsInit];
                return `${toDashCase(key)}${type ? `:${type}` : ''}=${value}`;
            })
            .join(',');
    }
}

export interface ScrcpyOptionsInit1_16 {
    logLevel: ScrcpyLogLevel;

    /**
     * The maximum value of both width and height.
     */
    maxSize: number;

    bitRate: number;

    /**
     * 0 for unlimited.
     *
     * @default 0
     */
    maxFps: number;

    /**
     * The orientation of the video stream.
     *
     * It will not keep the device screen in specific orientation,
     * only the captured video will in this orientation.
     */
    lockVideoOrientation: ScrcpyVideoOrientation;

    tunnelForward: boolean;

    crop: string;

    /**
     * Send PTS so that the client may record properly
     *
     * Note: When `sendFrameMeta: false` is specified,
     * `onChangeEncoding` event won't fire and `onVideoData` event doesn't
     * merge sps/pps frame and first video frame. Which means you can't use
     * the shipped decoders to render the video
     * (You can still record the stream into a file).
     *
     * @default true
     */
    sendFrameMeta: boolean;

    /**
     * @default true
     */
    control: boolean;

    displayId: number;

    showTouches: boolean;

    stayAwake: boolean;

    codecOptions: CodecOptions;

    encoderName: string;
}

export const VideoPacket =
    new Struct()
        .uint64('pts')
        .uint32('size')
        .uint8Array('data', { lengthField: 'size' });

export const NO_PTS = BigInt(1) << BigInt(63);

export const ScrcpyBackOrScreenOnEvent1_16 =
    ScrcpySimpleControlMessage;

export const ScrcpyInjectScrollControlMessage1_16 =
    new Struct()
        .fields(ScrcpySimpleControlMessage)
        .uint32('pointerX')
        .uint32('pointerY')
        .uint16('screenWidth')
        .uint16('screenHeight')
        .int32('scrollX')
        .int32('scrollY');

export class ScrcpyOptions1_16<T extends ScrcpyOptionsInit1_16 = ScrcpyOptionsInit1_16> implements ScrcpyOptions<T> {
    public value: Partial<T>;

    public constructor(value: Partial<ScrcpyOptionsInit1_16>) {
        if (new.target === ScrcpyOptions1_16 &&
            value.logLevel === ScrcpyLogLevel.Verbose) {
            value.logLevel = ScrcpyLogLevel.Debug;
        }

        if (new.target === ScrcpyOptions1_16 &&
            value.lockVideoOrientation === ScrcpyVideoOrientation.Initial) {
            value.lockVideoOrientation = ScrcpyVideoOrientation.Unlocked;
        }

        this.value = value as Partial<T>;
    }

    protected getArgumentOrder(): (keyof T)[] {
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

    protected getDefaultValue(): T {
        return {
            logLevel: ScrcpyLogLevel.Debug,
            maxSize: 0,
            bitRate: 8_000_000,
            maxFps: 0,
            lockVideoOrientation: ScrcpyVideoOrientation.Unlocked,
            tunnelForward: false,
            crop: '-',
            sendFrameMeta: true,
            control: true,
            displayId: 0,
            showTouches: false,
            stayAwake: false,
            codecOptions: new CodecOptions({}),
            encoderName: '-',
        } as T;
    }

    public formatServerArguments(): string[] {
        const defaults = this.getDefaultValue();
        return this.getArgumentOrder()
            .map(key => toScrcpyOptionValue(this.value[key] || defaults[key], '-'));
    }

    public createConnection(adb: Adb): ScrcpyClientConnection {
        const options: ScrcpyClientConnectionOptions = {
            // Old scrcpy connection always have control stream no matter what the option is
            control: true,
            sendDummyByte: true,
            sendDeviceMeta: true,
        };
        if (this.value.tunnelForward) {
            return new ScrcpyClientForwardConnection(adb, options);
        } else {
            return new ScrcpyClientReverseConnection(adb, options);
        }
    }

    public getOutputEncoderNameRegex(): RegExp {
        return /\s+scrcpy --encoder-name '(.*?)'/;
    }

    public createVideoStreamTransformer(): TransformStream<Uint8Array, VideoStreamPacket> {
        // Optimized path for video frames only
        if (this.value.sendFrameMeta === false) {
            return new TransformStream({
                transform(chunk, controller) {
                    controller.enqueue({
                        type: 'frame',
                        data: chunk,
                    });
                },
            });
        }

        let header: Uint8Array | undefined;

        let deserializeStream = new StructDeserializeStream(VideoPacket);
        return {
            writable: deserializeStream.writable,
            readable: deserializeStream.readable.pipeThrough(new TransformStream({
                transform(packet, controller) {
                    if (packet.pts === NO_PTS) {
                        const sequenceParameterSet = parse_sequence_parameter_set(packet.data.slice().buffer);

                        const {
                            profile_idc: profileIndex,
                            constraint_set: constraintSet,
                            level_idc: levelIndex,
                            pic_width_in_mbs_minus1,
                            pic_height_in_map_units_minus1,
                            frame_mbs_only_flag,
                            frame_crop_left_offset,
                            frame_crop_right_offset,
                            frame_crop_top_offset,
                            frame_crop_bottom_offset,
                        } = sequenceParameterSet;

                        const encodedWidth = (pic_width_in_mbs_minus1 + 1) * 16;
                        const encodedHeight = (pic_height_in_map_units_minus1 + 1) * (2 - frame_mbs_only_flag) * 16;
                        const cropLeft = frame_crop_left_offset * 2;
                        const cropRight = frame_crop_right_offset * 2;
                        const cropTop = frame_crop_top_offset * 2;
                        const cropBottom = frame_crop_bottom_offset * 2;

                        const croppedWidth = encodedWidth - cropLeft - cropRight;
                        const croppedHeight = encodedHeight - cropTop - cropBottom;

                        header = packet.data;
                        controller.enqueue({
                            type: 'configuration',
                            data: {
                                profileIndex,
                                constraintSet,
                                levelIndex,
                                encodedWidth,
                                encodedHeight,
                                cropLeft,
                                cropRight,
                                cropTop,
                                cropBottom,
                                croppedWidth,
                                croppedHeight,
                            }
                        });
                        return;
                    }

                    let frameData: Uint8Array;
                    if (header) {
                        frameData = new Uint8Array(header.byteLength + packet.data.byteLength);
                        frameData.set(header);
                        frameData.set(packet.data, header.byteLength);
                        header = undefined;
                    } else {
                        frameData = packet.data;
                    }

                    controller.enqueue({
                        type: 'frame',
                        pts: packet.pts,
                        data: frameData,
                    });
                }
            }))
        };
    }

    public getControlMessageTypes(): ScrcpyControlMessageType[] {
        return [
            /*  0 */ ScrcpyControlMessageType.InjectKeycode,
            /*  1 */ ScrcpyControlMessageType.InjectText,
            /*  2 */ ScrcpyControlMessageType.InjectTouch,
            /*  3 */ ScrcpyControlMessageType.InjectScroll,
            /*  4 */ ScrcpyControlMessageType.BackOrScreenOn,
            /*  5 */ ScrcpyControlMessageType.ExpandNotificationPanel,
            /*  6 */ ScrcpyControlMessageType.CollapseNotificationPanel,
            /*  7 */ ScrcpyControlMessageType.GetClipboard,
            /*  8 */ ScrcpyControlMessageType.SetClipboard,
            /*  9 */ ScrcpyControlMessageType.SetScreenPowerMode,
            /* 10 */ ScrcpyControlMessageType.RotateDevice,
        ];
    }

    public serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnEvent1_18,
    ) {
        if (message.action === AndroidKeyEventAction.Down) {
            return ScrcpyBackOrScreenOnEvent1_16.serialize(message);
        }

        return undefined;
    }

    public serializeInjectScrollControlMessage(
        message: ScrcpyInjectScrollControlMessage1_22,
    ): Uint8Array {
        return ScrcpyInjectScrollControlMessage1_16.serialize(message);
    }
}
