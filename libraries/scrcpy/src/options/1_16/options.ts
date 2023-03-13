import type { ReadableStream } from "@yume-chan/stream-extra";
import {
    BufferedReadableStream,
    StructDeserializeStream,
    TransformStream,
} from "@yume-chan/stream-extra";
import type { ValueOrPromise } from "@yume-chan/struct";
import Struct, {
    NumberFieldType,
    decodeUtf8,
    placeholder,
} from "@yume-chan/struct";

import type {
    AndroidMotionEventAction,
    ScrcpyBackOrScreenOnControlMessage,
    ScrcpyInjectTouchControlMessage,
    ScrcpySetClipboardControlMessage,
} from "../../control/index.js";
import {
    AndroidKeyEventAction,
    BasicControlMessage,
    ScrcpyControlMessageType,
} from "../../control/index.js";
import type {
    ScrcpyOptions,
    ScrcpyVideoStreamMetadata,
    ScrcpyVideoStreamPacket,
} from "../types.js";
import { toScrcpyOptionValue } from "../types.js";

import { CodecOptions } from "./codec-options.js";
import { ScrcpyFloatToUint16FieldDefinition } from "./float-to-uint16.js";
import {
    findH264Configuration,
    parseSequenceParameterSet,
    removeH264Emulation,
} from "./h264-configuration.js";
import type { ScrcpyScrollController } from "./scroll.js";
import { ScrcpyScrollController1_16 } from "./scroll.js";

export enum ScrcpyLogLevel {
    Verbose = "verbose",
    Debug = "debug",
    Info = "info",
    Warn = "warn",
    Error = "error",
}

export enum ScrcpyVideoOrientation {
    Initial = -2,
    Unlocked = -1,
    Portrait = 0,
    Landscape = 1,
    PortraitFlipped = 2,
    LandscapeFlipped = 3,
}

export interface ScrcpyOptionsInit1_16 {
    logLevel?: ScrcpyLogLevel;

    /**
     * The maximum value of both width and height.
     */
    maxSize?: number;

    bitRate?: number;

    /**
     * 0 for unlimited.
     *
     * @default 0
     */
    maxFps?: number;

    /**
     * The orientation of the video stream.
     *
     * It will not keep the device screen in specific orientation,
     * only the captured video will in this orientation.
     */
    lockVideoOrientation?: ScrcpyVideoOrientation;

    /**
     * Use ADB forward tunnel instead of reverse tunnel.
     *
     * This option is mainly used for working around the bug that on Android <9,
     * ADB daemon can't create reverse tunnels if connected wirelessly (ADB over WiFi).
     *
     * When using `AdbScrcpyClient`, it can detect this situation and enable this option automatically.
     */
    tunnelForward?: boolean;

    crop?: string;

    /**
     * Send PTS so that the client may record properly
     *
     * Note: When `sendFrameMeta: false` is specified,
     * the video stream will not contain `configuration` typed packets,
     * which means it can't be decoded by the companion decoders.
     * It's still possible to record the stream into a file,
     * or to decode it with a more tolerant decoder like FFMpeg.
     *
     * @default true
     */
    sendFrameMeta?: boolean;

    /**
     * @default true
     */
    control?: boolean;

    displayId?: number;

    showTouches?: boolean;

    stayAwake?: boolean;

    codecOptions?: CodecOptions;

    encoderName?: string;
}

export const ScrcpyMediaPacket = new Struct()
    .uint64("pts")
    .uint32("size")
    .uint8Array("data", { lengthField: "size" });

export const SCRCPY_MEDIA_PACKET_FLAG_CONFIG = BigInt(1) << BigInt(63);

export const ScrcpyBackOrScreenOnControlMessage1_16 = BasicControlMessage;

export const ScrcpySetClipboardControlMessage1_15 = new Struct()
    .uint8("type")
    .uint32("length")
    .string("content", { lengthField: "length" });

export type ScrcpySetClipboardControlMessage1_15 =
    (typeof ScrcpySetClipboardControlMessage1_15)["TInit"];

export const ScrcpyInjectTouchControlMessage1_16 = new Struct()
    .uint8("type")
    .uint8("action", placeholder<AndroidMotionEventAction>())
    .uint64("pointerId")
    .uint32("pointerX")
    .uint32("pointerY")
    .uint16("screenWidth")
    .uint16("screenHeight")
    .field("pressure", ScrcpyFloatToUint16FieldDefinition)
    .uint32("buttons");

export type ScrcpyInjectTouchControlMessage1_16 =
    (typeof ScrcpyInjectTouchControlMessage1_16)["TInit"];

export class ScrcpyOptions1_16<
    T extends ScrcpyOptionsInit1_16 = ScrcpyOptionsInit1_16
> implements ScrcpyOptions<T>
{
    public value: Required<T>;

    public constructor(init: ScrcpyOptionsInit1_16) {
        if (
            new.target === ScrcpyOptions1_16 &&
            init.logLevel === ScrcpyLogLevel.Verbose
        ) {
            init.logLevel = ScrcpyLogLevel.Debug;
        }

        if (
            new.target === ScrcpyOptions1_16 &&
            init.lockVideoOrientation === ScrcpyVideoOrientation.Initial
        ) {
            init.lockVideoOrientation = ScrcpyVideoOrientation.Unlocked;
        }

        this.value = Object.assign(this.getDefaultValues(), init);
    }

    protected getArgumentOrder(): (keyof T)[] {
        return [
            "logLevel",
            "maxSize",
            "bitRate",
            "maxFps",
            "lockVideoOrientation",
            "tunnelForward",
            "crop",
            "sendFrameMeta",
            "control",
            "displayId",
            "showTouches",
            "stayAwake",
            "codecOptions",
            "encoderName",
        ];
    }

    public getDefaultValues(): Required<T> {
        return {
            logLevel: ScrcpyLogLevel.Debug,
            maxSize: 0,
            bitRate: 8_000_000,
            maxFps: 0,
            lockVideoOrientation: ScrcpyVideoOrientation.Unlocked,
            tunnelForward: false,
            crop: "-",
            sendFrameMeta: true,
            control: true,
            displayId: 0,
            showTouches: false,
            stayAwake: false,
            codecOptions: new CodecOptions(),
            encoderName: "-",
        } as Required<T>;
    }

    public serializeServerArguments(): string[] {
        const defaults = this.getDefaultValues();
        return this.getArgumentOrder().map((key) =>
            toScrcpyOptionValue(this.value[key] || defaults[key], "-")
        );
    }

    public getOutputEncoderNameRegex(): RegExp {
        return /\s+scrcpy --encoder-name '(.*?)'/;
    }

    protected async parseCString(
        stream: BufferedReadableStream
    ): Promise<string> {
        let result = decodeUtf8(await stream.readExactly(64));
        result = result.substring(0, result.indexOf("\0"));
        return result;
    }

    protected async parseUint16BE(
        stream: BufferedReadableStream
    ): Promise<number> {
        const buffer = await stream.readExactly(NumberFieldType.Uint16.size);
        return NumberFieldType.Uint16.deserialize(buffer, false);
    }

    protected async parseUint32BE(
        stream: BufferedReadableStream
    ): Promise<number> {
        const buffer = await stream.readExactly(NumberFieldType.Uint32.size);
        return NumberFieldType.Uint32.deserialize(buffer, false);
    }

    public parseVideoStreamMetadata(
        stream: ReadableStream<Uint8Array>
    ): ValueOrPromise<[ReadableStream<Uint8Array>, ScrcpyVideoStreamMetadata]> {
        return (async () => {
            const buffered = new BufferedReadableStream(stream);
            const metadata: ScrcpyVideoStreamMetadata = {};
            metadata.deviceName = await this.parseCString(buffered);
            metadata.width = await this.parseUint16BE(buffered);
            metadata.height = await this.parseUint16BE(buffered);
            return [buffered.release(), metadata];
        })();
    }

    public createVideoStreamTransformer(): TransformStream<
        Uint8Array,
        ScrcpyVideoStreamPacket
    > {
        // Optimized path for video frames only
        if (!this.value.sendFrameMeta) {
            return new TransformStream({
                transform(chunk, controller) {
                    controller.enqueue({
                        type: "frame",
                        data: chunk,
                    });
                },
            });
        }

        let header: Uint8Array | undefined;

        const deserializeStream = new StructDeserializeStream(
            ScrcpyMediaPacket
        );
        return {
            writable: deserializeStream.writable,
            readable: deserializeStream.readable.pipeThrough(
                new TransformStream({
                    transform(packet, controller) {
                        if (packet.pts === SCRCPY_MEDIA_PACKET_FLAG_CONFIG) {
                            const {
                                sequenceParameterSet,
                                pictureParameterSet,
                            } = findH264Configuration(packet.data);

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
                            } = parseSequenceParameterSet(
                                removeH264Emulation(sequenceParameterSet)
                            );

                            const encodedWidth =
                                (pic_width_in_mbs_minus1 + 1) * 16;
                            const encodedHeight =
                                (pic_height_in_map_units_minus1 + 1) *
                                (2 - frame_mbs_only_flag) *
                                16;
                            const cropLeft = frame_crop_left_offset * 2;
                            const cropRight = frame_crop_right_offset * 2;
                            const cropTop = frame_crop_top_offset * 2;
                            const cropBottom = frame_crop_bottom_offset * 2;

                            const croppedWidth =
                                encodedWidth - cropLeft - cropRight;
                            const croppedHeight =
                                encodedHeight - cropTop - cropBottom;

                            header = packet.data;
                            controller.enqueue({
                                type: "configuration",
                                pictureParameterSet,
                                sequenceParameterSet,
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
                                },
                            });
                            return;
                        }

                        let frameData: Uint8Array;
                        if (header) {
                            frameData = new Uint8Array(
                                header.byteLength + packet.data.byteLength
                            );
                            frameData.set(header);
                            frameData.set(packet.data, header.byteLength);
                            header = undefined;
                        } else {
                            frameData = packet.data;
                        }

                        controller.enqueue({
                            type: "frame",
                            pts: packet.pts,
                            data: frameData,
                        });
                    },
                })
            ),
        };
    }

    public getControlMessageTypes(): ScrcpyControlMessageType[] {
        return [
            /*  0 */ ScrcpyControlMessageType.InjectKeyCode,
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

    serializeInjectTouchControlMessage(
        message: ScrcpyInjectTouchControlMessage
    ): Uint8Array {
        return ScrcpyInjectTouchControlMessage1_16.serialize(message);
    }

    public serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnControlMessage
    ) {
        if (message.action === AndroidKeyEventAction.Down) {
            return ScrcpyBackOrScreenOnControlMessage1_16.serialize(message);
        }

        return undefined;
    }

    public serializeSetClipboardControlMessage(
        message: ScrcpySetClipboardControlMessage
    ): Uint8Array {
        return ScrcpySetClipboardControlMessage1_15.serialize(message);
    }

    public getScrollController(): ScrcpyScrollController {
        return new ScrcpyScrollController1_16();
    }
}
