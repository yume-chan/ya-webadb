import type { ReadableStream, TransformStream } from "@yume-chan/stream-extra";
import type { AsyncExactReadable, ValueOrPromise } from "@yume-chan/struct";

import type {
    ScrcpyBackOrScreenOnControlMessage,
    ScrcpyControlMessageType,
    ScrcpyInjectTouchControlMessage,
    ScrcpySetClipboardControlMessage,
} from "../control/index.js";

import type { ScrcpyScrollController } from "./1_16/scroll.js";
import type {
    ScrcpyAudioStreamMetadata,
    ScrcpyMediaStreamPacket,
    ScrcpyVideoStream,
} from "./codec.js";

export const DEFAULT_SERVER_PATH = "/data/local/tmp/scrcpy-server.jar";

export interface ScrcpyOptionValue {
    toOptionValue(): string | undefined;
}

export function isScrcpyOptionValue(
    value: unknown,
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

    if (
        typeof value !== "string" &&
        typeof value !== "number" &&
        typeof value !== "boolean"
    ) {
        throw new Error(`Invalid option value: ${String(value)}`);
    }

    return String(value);
}

export interface ScrcpyEncoder {
    type: "video" | "audio";
    codec?: string;
    name: string;
}

export interface ScrcpyDisplay {
    id: number;
    resolution?: string;
}

const SkipDefaultMark = Symbol("SkipDefault");

export abstract class ScrcpyOptions<T extends object> {
    #base!: ScrcpyOptions<object>;

    abstract get defaults(): Required<T>;

    get controlMessageTypes(): readonly ScrcpyControlMessageType[] {
        return this.#base.controlMessageTypes;
    }

    readonly value: Required<T>;

    get clipboard(): ReadableStream<string> {
        return this.#base.clipboard;
    }

    constructor(
        base: (new (value: never) => ScrcpyOptions<object>) | undefined,
        value: T,
        defaults: Required<T>,
    ) {
        if (!(SkipDefaultMark in value)) {
            value = {
                ...defaults,
                ...value,
                [SkipDefaultMark]: true,
            } as Required<T>;
        }

        this.value = value as Required<T>;

        if (base !== undefined) {
            this.#base = new base(value as never);
        }
    }

    abstract serialize(): string[];

    /**
     * Set the essential options to let Scrcpy server print out available encoders.
     */
    setListEncoders(): void {
        this.#base.setListEncoders();
    }

    /**
     * Set the essential options to let Scrcpy server print out available displays.
     */
    setListDisplays(): void {
        this.#base.setListDisplays();
    }

    /**
     * Parse encoder information from Scrcpy server output
     * @param line One line of Scrcpy server output
     */
    parseEncoder(line: string): ScrcpyEncoder | undefined {
        return this.#base.parseEncoder(line);
    }

    /**
     * Parse display information from Scrcpy server output
     * @param line One line of Scrcpy server output
     */
    parseDisplay(line: string): ScrcpyDisplay | undefined {
        return this.#base.parseDisplay(line);
    }

    /**
     * Parse the device metadata from video stream according to the current version and options.
     * @param stream The video stream.
     * @returns
     * A tuple of the video stream and the metadata.
     *
     * The returned video stream may be different from the input stream, and should be used for further processing.
     */
    parseVideoStreamMetadata(
        stream: ReadableStream<Uint8Array>,
    ): ValueOrPromise<ScrcpyVideoStream> {
        return this.#base.parseVideoStreamMetadata(stream);
    }

    parseAudioStreamMetadata(
        stream: ReadableStream<Uint8Array>,
    ): ValueOrPromise<ScrcpyAudioStreamMetadata> {
        return this.#base.parseAudioStreamMetadata(stream);
    }

    parseDeviceMessage(
        id: number,
        stream: AsyncExactReadable,
    ): Promise<boolean> {
        return this.#base.parseDeviceMessage(id, stream);
    }

    createMediaStreamTransformer(): TransformStream<
        Uint8Array,
        ScrcpyMediaStreamPacket
    > {
        return this.#base.createMediaStreamTransformer();
    }

    serializeInjectTouchControlMessage(
        message: ScrcpyInjectTouchControlMessage,
    ): Uint8Array {
        return this.#base.serializeInjectTouchControlMessage(message);
    }

    serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnControlMessage,
    ): Uint8Array | undefined {
        return this.#base.serializeBackOrScreenOnControlMessage(message);
    }

    serializeSetClipboardControlMessage(
        message: ScrcpySetClipboardControlMessage,
    ): [Uint8Array, Promise<void> | undefined] {
        return this.#base.serializeSetClipboardControlMessage(message);
    }

    createScrollController(): ScrcpyScrollController {
        return this.#base.createScrollController();
    }
}
