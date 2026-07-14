import type { MaybePromiseLike } from "@yume-chan/async";
import type { ReadableStream, TransformStream } from "@yume-chan/stream-extra";

import type {
    ScrcpyDisplay,
    ScrcpyMediaStreamPacket,
    ScrcpyOptions,
    ScrcpyScrollController,
    ScrcpyVideoStream,
} from "../base/index.js";
import { ScrcpyDeviceMessageParsers } from "../base/index.js";
import type { MapBoolean } from "../base/options.js";
import type {
    ScrcpyBackOrScreenOnControlMessage,
    ScrcpyInjectTouchControlMessage,
    ScrcpySetClipboardControlMessage,
} from "../latest.js";

import type { ComputeOptionTypes, Init } from "./impl/index.js";
import {
    ClipboardStream,
    computeOptionValues,
    ControlMessageTypes,
    createMediaStreamTransformer,
    createScrollController,
    Defaults,
    parseDisplay,
    parseVideoStreamMetadata,
    serialize,
    serializeBackOrScreenOnControlMessage,
    serializeInjectTouchControlMessage,
    SerializeOrder,
    serializeSetClipboardControlMessage,
    setListDisplays,
} from "./impl/index.js";

export class ScrcpyOptions1_15<
    TInit extends Init = Init,
> implements ScrcpyOptions<ScrcpyOptions1_15.Value<TInit>> {
    static readonly Defaults = Defaults;

    readonly value: ScrcpyOptions1_15.Value<TInit>;

    get controlMessageTypes(): typeof ControlMessageTypes {
        return ControlMessageTypes;
    }

    #clipboard: ClipboardStream | undefined;
    get clipboard(): MapBoolean<
        this["value"]["control"],
        ReadableStream<string>,
        undefined
    > {
        return this.#clipboard as never;
    }

    #deviceMessageParsers = new ScrcpyDeviceMessageParsers();
    get deviceMessageParsers() {
        return this.#deviceMessageParsers;
    }

    constructor(init: TInit) {
        this.value = computeOptionValues(init, Defaults);

        if (this.value.control) {
            this.#clipboard = this.#deviceMessageParsers.add(
                new ClipboardStream(),
            );
        }
    }

    serialize(): string[] {
        return serialize(this.value, SerializeOrder);
    }

    setListDisplays(): void {
        setListDisplays(this.value);
    }

    parseDisplay(line: string): ScrcpyDisplay | undefined {
        return parseDisplay(line);
    }

    parseVideoStreamMetadata(
        stream: ReadableStream<Uint8Array>,
    ): MaybePromiseLike<ScrcpyVideoStream> {
        return parseVideoStreamMetadata(stream);
    }

    createMediaStreamTransformer(): TransformStream<
        Uint8Array,
        ScrcpyMediaStreamPacket
    > {
        return createMediaStreamTransformer(this.value);
    }

    serializeInjectTouchControlMessage(
        message: ScrcpyInjectTouchControlMessage,
    ): Uint8Array {
        if (!this.value.control) {
            throw new Error("control is disabled");
        }
        return serializeInjectTouchControlMessage(message);
    }

    serializeBackOrScreenOnControlMessage(
        message: ScrcpyBackOrScreenOnControlMessage,
    ): Uint8Array | undefined {
        if (!this.value.control) {
            throw new Error("control is disabled");
        }
        return serializeBackOrScreenOnControlMessage(message);
    }

    serializeSetClipboardControlMessage(
        message: ScrcpySetClipboardControlMessage,
    ): Uint8Array {
        if (!this.value.control) {
            throw new Error("control is disabled");
        }
        return serializeSetClipboardControlMessage(message);
    }

    createScrollController(): ScrcpyScrollController {
        if (!this.value.control) {
            throw new Error("control is disabled");
        }
        return createScrollController();
    }
}

type Init_ = Init;

export namespace ScrcpyOptions1_15 {
    export type Init = Init_;

    export type Value<TInit extends Init> = ComputeOptionTypes<
        TInit,
        typeof Defaults
    >;
}
