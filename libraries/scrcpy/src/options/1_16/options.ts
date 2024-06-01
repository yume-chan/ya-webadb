import {
    getUint16BigEndian,
    getUint32BigEndian,
} from "@yume-chan/no-data-view";
import type {
    PushReadableStreamController,
    ReadableStream,
} from "@yume-chan/stream-extra";
import {
    BufferedReadableStream,
    PushReadableStream,
    StructDeserializeStream,
    TransformStream,
} from "@yume-chan/stream-extra";
import type { AsyncExactReadable, ValueOrPromise } from "@yume-chan/struct";
import { decodeUtf8 } from "@yume-chan/struct";

import type {
    ScrcpyBackOrScreenOnControlMessage,
    ScrcpyControlMessageType,
    ScrcpyInjectTouchControlMessage,
    ScrcpySetClipboardControlMessage,
} from "../../control/index.js";
import { AndroidKeyEventAction } from "../../control/index.js";
import type {
    ScrcpyMediaStreamPacket,
    ScrcpyVideoStream,
    ScrcpyVideoStreamMetadata,
} from "../codec.js";
import { ScrcpyVideoCodecId } from "../codec.js";
import type { ScrcpyDisplay, ScrcpyEncoder } from "../types.js";
import { ScrcpyOptions, toScrcpyOptionValue } from "../types.js";

import { CodecOptions } from "./codec-options.js";
import type { ScrcpyOptionsInit1_16 } from "./init.js";
import { ScrcpyLogLevel1_16, ScrcpyVideoOrientation1_16 } from "./init.js";
import {
    SCRCPY_CONTROL_MESSAGE_TYPES_1_16,
    SCRCPY_MEDIA_PACKET_FLAG_CONFIG,
    ScrcpyBackOrScreenOnControlMessage1_16,
    ScrcpyClipboardDeviceMessage,
    ScrcpyInjectTouchControlMessage1_16,
    ScrcpyMediaStreamRawPacket,
    ScrcpySetClipboardControlMessage1_15,
} from "./message.js";
import type { ScrcpyScrollController } from "./scroll.js";
import { ScrcpyScrollController1_16 } from "./scroll.js";

export class ScrcpyOptions1_16 extends ScrcpyOptions<ScrcpyOptionsInit1_16> {
    static readonly DEFAULTS = {
        logLevel: ScrcpyLogLevel1_16.Debug,
        maxSize: 0,
        bitRate: 8_000_000,
        maxFps: 0,
        lockVideoOrientation: ScrcpyVideoOrientation1_16.Unlocked,
        tunnelForward: false,
        crop: undefined,
        sendFrameMeta: true,
        control: true,
        displayId: 0,
        showTouches: false,
        stayAwake: false,
        codecOptions: new CodecOptions(),
    } as const satisfies Required<ScrcpyOptionsInit1_16>;

    static readonly SERIALIZE_ORDER = [
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
    ] as const satisfies readonly (keyof ScrcpyOptionsInit1_16)[];

    static serialize<T>(options: T, order: readonly (keyof T)[]) {
        return order.map((key) => toScrcpyOptionValue(options[key], "-"));
    }

    /**
     * Parse a fixed-length, null-terminated string.
     * @param stream The stream to read from
     * @param maxLength The maximum length of the string, including the null terminator, in bytes
     * @returns The parsed string, without the null terminator
     */
    static async parseCString(
        stream: AsyncExactReadable,
        maxLength: number,
    ): Promise<string> {
        const buffer = await stream.readExactly(maxLength);
        // If null terminator is not found, `subarray(0, -1)` will remove the last byte
        // But since it's a invalid case, it's fine
        return decodeUtf8(buffer.subarray(0, buffer.indexOf(0)));
    }

    static async parseUint16BE(stream: AsyncExactReadable): Promise<number> {
        const buffer = await stream.readExactly(2);
        return getUint16BigEndian(buffer, 0);
    }

    static async parseUint32BE(stream: AsyncExactReadable): Promise<number> {
        const buffer = await stream.readExactly(4);
        return getUint32BigEndian(buffer, 0);
    }

    readonly defaults: Required<ScrcpyOptionsInit1_16> =
        ScrcpyOptions1_16.DEFAULTS;

    override get controlMessageTypes(): readonly ScrcpyControlMessageType[] {
        return SCRCPY_CONTROL_MESSAGE_TYPES_1_16;
    }

    #clipboardController!: PushReadableStreamController<string>;
    #clipboard: ReadableStream<string>;
    override get clipboard() {
        return this.#clipboard;
    }

    constructor(init: ScrcpyOptionsInit1_16) {
        super(undefined, init, ScrcpyOptions1_16.DEFAULTS);
        this.#clipboard = new PushReadableStream<string>((controller) => {
            this.#clipboardController = controller;
        });
    }

    serialize(): string[] {
        return ScrcpyOptions1_16.serialize(
            this.value,
            ScrcpyOptions1_16.SERIALIZE_ORDER,
        );
    }

    override setListEncoders(): void {
        throw new Error("Not supported");
    }

    override setListDisplays(): void {
        // Set to an invalid value
        // Server will print valid values before crashing
        // (server will crash before opening sockets)
        this.value.displayId = -1;
    }

    override parseEncoder(): ScrcpyEncoder | undefined {
        throw new Error("Not supported");
    }

    override parseDisplay(line: string): ScrcpyDisplay | undefined {
        const match = line.match(/^\s+scrcpy --display (\d+)$/);
        if (match) {
            return {
                id: Number.parseInt(match[1]!, 10),
            };
        }
        return undefined;
    }

    override parseVideoStreamMetadata(
        stream: ReadableStream<Uint8Array>,
    ): ValueOrPromise<ScrcpyVideoStream> {
        return (async () => {
            const buffered = new BufferedReadableStream(stream);
            const metadata: ScrcpyVideoStreamMetadata = {
                codec: ScrcpyVideoCodecId.H264,
            };
            metadata.deviceName = await ScrcpyOptions1_16.parseCString(
                buffered,
                64,
            );
            metadata.width = await ScrcpyOptions1_16.parseUint16BE(buffered);
            metadata.height = await ScrcpyOptions1_16.parseUint16BE(buffered);
            return { stream: buffered.release(), metadata };
        })();
    }

    override parseAudioStreamMetadata(): never {
        throw new Error("Not supported");
    }

    override async parseDeviceMessage(
        id: number,
        stream: AsyncExactReadable,
    ): Promise<boolean> {
        switch (id) {
            case 0: {
                const message =
                    await ScrcpyClipboardDeviceMessage.deserialize(stream);
                await this.#clipboardController.enqueue(message.content);
                return true;
            }
            default:
                return false;
        }
    }

    override createMediaStreamTransformer(): TransformStream<
        Uint8Array,
        ScrcpyMediaStreamPacket
    > {
        // Optimized path for video frames only
        if (!this.value.sendFrameMeta) {
            return new TransformStream({
                transform(chunk, controller) {
                    controller.enqueue({
                        type: "data",
                        data: chunk,
                    });
                },
            });
        }

        const deserializeStream = new StructDeserializeStream(
            ScrcpyMediaStreamRawPacket,
        );
        return {
            writable: deserializeStream.writable,
            readable: deserializeStream.readable.pipeThrough(
                new TransformStream({
                    transform(packet, controller) {
                        if (packet.pts === SCRCPY_MEDIA_PACKET_FLAG_CONFIG) {
                            controller.enqueue({
                                type: "configuration",
                                data: packet.data,
                            });
                            return;
                        }

                        controller.enqueue({
                            type: "data",
                            pts: packet.pts,
                            data: packet.data,
                        });
                    },
                }),
            ),
        };
    }

    override serializeInjectTouchControlMessage(
        message: ScrcpyInjectTouchControlMessage,
    ): Uint8Array {
        return ScrcpyInjectTouchControlMessage1_16.serialize(message);
    }

    override serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnControlMessage,
    ) {
        if (message.action === AndroidKeyEventAction.Down) {
            return ScrcpyBackOrScreenOnControlMessage1_16.serialize(message);
        }

        return undefined;
    }

    override serializeSetClipboardControlMessage(
        message: ScrcpySetClipboardControlMessage,
    ): Uint8Array {
        return ScrcpySetClipboardControlMessage1_15.serialize(message);
    }

    override createScrollController(): ScrcpyScrollController {
        return new ScrcpyScrollController1_16();
    }
}
