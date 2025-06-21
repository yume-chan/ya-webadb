import { PromiseResolver } from "@yume-chan/async";
import type { AsyncExactReadable, StructInit } from "@yume-chan/struct";
import { string, struct, u32, u64, u8 } from "@yume-chan/struct";

import type { ScrcpyDeviceMessageParser } from "../../base/index.js";
import type { ScrcpySetClipboardControlMessage } from "../../latest.js";

export const AckClipboardDeviceMessage = struct(
    { sequence: u64 },
    { littleEndian: false },
);

export const SetClipboardControlMessage = struct(
    {
        type: u8,
        sequence: u64,
        paste: u8<boolean>(),
        content: string(u32),
    },
    { littleEndian: false },
);

export type SetClipboardControlMessage = StructInit<
    typeof SetClipboardControlMessage
>;

export class AckClipboardHandler implements ScrcpyDeviceMessageParser {
    #resolvers = new Map<bigint, PromiseResolver<void>>();

    #closed = false;

    readonly id = 1;

    async parse(_id: number, stream: AsyncExactReadable): Promise<undefined> {
        const message = await AckClipboardDeviceMessage.deserialize(stream);
        const resolver = this.#resolvers.get(message.sequence);
        if (resolver) {
            resolver.resolve();
            this.#resolvers.delete(message.sequence);
        }
    }

    close(): void {
        for (const resolver of this.#resolvers.values()) {
            resolver.reject();
        }
        this.#resolvers.clear();
        this.#closed = true;
    }

    error(e?: unknown): void {
        for (const resolver of this.#resolvers.values()) {
            resolver.reject(e);
        }
        this.#resolvers.clear();
        this.#closed = true;
    }

    serializeSetClipboardControlMessage(
        message: ScrcpySetClipboardControlMessage,
    ): Uint8Array | [Uint8Array, Promise<void>] {
        if (message.sequence === 0n) {
            return SetClipboardControlMessage.serialize(message);
        }

        if (this.#closed) {
            throw new Error();
        }

        const resolver = new PromiseResolver<void>();
        this.#resolvers.set(message.sequence, resolver);
        return [
            SetClipboardControlMessage.serialize(message),
            resolver.promise,
        ];
    }
}
