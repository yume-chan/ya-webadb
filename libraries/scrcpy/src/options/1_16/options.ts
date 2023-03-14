import type { ReadableStream } from "@yume-chan/stream-extra";
import {
    BufferedReadableStream,
    StructDeserializeStream,
    TransformStream,
} from "@yume-chan/stream-extra";
import type { AsyncExactReadable, ValueOrPromise } from "@yume-chan/struct";
import { NumberFieldType, decodeUtf8 } from "@yume-chan/struct";

import type {
    ScrcpyBackOrScreenOnControlMessage,
    ScrcpyControlMessageType,
    ScrcpyInjectTouchControlMessage,
    ScrcpySetClipboardControlMessage,
} from "../../control/index.js";
import { AndroidKeyEventAction } from "../../control/index.js";
import type {
    ScrcpyEncoder,
    ScrcpyOptions,
    ScrcpyVideoStreamMetadata,
    ScrcpyVideoStreamPacket,
} from "../types.js";
import { toScrcpyOptionValue } from "../types.js";

import {
    findH264Configuration,
    parseSequenceParameterSet,
    removeH264Emulation,
} from "./h264-configuration.js";
import type { ScrcpyOptionsInit1_16 } from "./init.js";
import { SCRCPY_OPTIONS_DEFAULT_1_16 } from "./init.js";
import {
    SCRCPY_CONTROL_MESSAGE_TYPES_1_16,
    SCRCPY_MEDIA_PACKET_FLAG_CONFIG,
    SCRCPY_OPTIONS_ORDER_1_16,
    ScrcpyBackOrScreenOnControlMessage1_16,
    ScrcpyInjectTouchControlMessage1_16,
    ScrcpyMediaPacket,
    ScrcpySetClipboardControlMessage1_15,
} from "./message.js";
import type { ScrcpyScrollController } from "./scroll.js";
import { ScrcpyScrollController1_16 } from "./scroll.js";

export class ScrcpyOptions1_16 implements ScrcpyOptions<ScrcpyOptionsInit1_16> {
    public static serialize<T>(options: T, order: readonly (keyof T)[]) {
        return order.map((key) => toScrcpyOptionValue(options[key], "-"));
    }

    public static async parseCString(
        stream: AsyncExactReadable,
        maxLength: number
    ): Promise<string> {
        let result = decodeUtf8(await stream.readExactly(maxLength));
        result = result.substring(0, result.indexOf("\0"));
        return result;
    }

    public static async parseUint16BE(
        stream: AsyncExactReadable
    ): Promise<number> {
        const buffer = await stream.readExactly(NumberFieldType.Uint16.size);
        return NumberFieldType.Uint16.deserialize(buffer, false);
    }

    public static async parseUint32BE(
        stream: AsyncExactReadable
    ): Promise<number> {
        const buffer = await stream.readExactly(NumberFieldType.Uint32.size);
        return NumberFieldType.Uint32.deserialize(buffer, false);
    }

    public value: Required<ScrcpyOptionsInit1_16>;

    public readonly defaults: Required<ScrcpyOptionsInit1_16> =
        SCRCPY_OPTIONS_DEFAULT_1_16;

    public readonly controlMessageTypes: readonly ScrcpyControlMessageType[] =
        SCRCPY_CONTROL_MESSAGE_TYPES_1_16;

    public constructor(init: ScrcpyOptionsInit1_16) {
        this.value = { ...SCRCPY_OPTIONS_DEFAULT_1_16, ...init };
    }

    public serialize(): string[] {
        return ScrcpyOptions1_16.serialize(
            this.value,
            SCRCPY_OPTIONS_ORDER_1_16
        );
    }

    public parseEncoder(): ScrcpyEncoder | undefined {
        throw new Error("Not supported");
    }

    public parseVideoStreamMetadata(
        stream: ReadableStream<Uint8Array>
    ): ValueOrPromise<[ReadableStream<Uint8Array>, ScrcpyVideoStreamMetadata]> {
        return (async () => {
            const buffered = new BufferedReadableStream(stream);
            const metadata: ScrcpyVideoStreamMetadata = {};
            metadata.deviceName = await ScrcpyOptions1_16.parseCString(
                buffered,
                64
            );
            metadata.width = await ScrcpyOptions1_16.parseUint16BE(buffered);
            metadata.height = await ScrcpyOptions1_16.parseUint16BE(buffered);
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

    public serializeInjectTouchControlMessage(
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

    public createScrollController(): ScrcpyScrollController {
        return new ScrcpyScrollController1_16();
    }
}
