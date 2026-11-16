import type { ReadableStream } from "@yume-chan/stream-extra";
import type { AsyncExactReadable } from "@yume-chan/struct";

import type {
    ScrcpySetClipboardControlMessage,
    ScrcpyUHidOutputStream,
} from "../latest.js";

type MapBoolean<T extends boolean, TTrue, TFalse> = T extends true
    ? TTrue
    : TFalse;

export type ScrcpyDeviceMessageClipboard<TOptions extends object> =
    TOptions extends { clipboardAutosync: infer T extends boolean }
        ? MapBoolean<T, ReadableStream<string>, undefined>
        : TOptions extends { control: infer T extends boolean }
          ? MapBoolean<T, ReadableStream<string>, undefined>
          : undefined;

export interface ScrcpyDeviceMessageClipboardAckHandler {
    serializeSetClipboardControlMessage(
        message: ScrcpySetClipboardControlMessage,
    ): Uint8Array | [Uint8Array, Promise<void>];
}

export interface ScrcpyDeviceMessageParser {
    readonly clipboard?: ReadableStream<string> | undefined;

    readonly uHidOutput?: ScrcpyUHidOutputStream | undefined;

    readonly ackClipboardHandler?:
        ScrcpyDeviceMessageClipboardAckHandler | undefined;

    parse(id: number, stream: AsyncExactReadable): Promise<undefined>;

    close(): void;

    error(e?: unknown): void;

    serializeSetClipboardControlMessage?(
        message: ScrcpySetClipboardControlMessage,
    ): Uint8Array | [Uint8Array, Promise<void>];
}

export interface ScrcpyDeviceMessageHandler {
    parse(stream: AsyncExactReadable): Promise<undefined>;

    close(): void;

    error(e?: unknown): void;
}
