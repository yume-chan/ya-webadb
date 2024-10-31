// cspell: ignore autosync

import { PromiseResolver } from "@yume-chan/async";
import type { AsyncExactReadable, StructInit } from "@yume-chan/struct";
import { Struct, string, u32, u64, u8 } from "@yume-chan/struct";

import type { ScrcpySetClipboardControlMessage } from "../control/index.js";

import type { ScrcpyOptionsInit1_18 } from "./1_18.js";
import { ScrcpyOptions1_18 } from "./1_18.js";
import { ScrcpyOptions, toScrcpyOptionValue } from "./types.js";

export const ScrcpyAckClipboardDeviceMessage = new Struct(
    { sequence: u64 },
    { littleEndian: false },
);

export interface ScrcpyOptionsInit1_21 extends ScrcpyOptionsInit1_18 {
    clipboardAutosync?: boolean;
}

function toSnakeCase(input: string): string {
    return input.replace(/([A-Z])/g, "_$1").toLowerCase();
}

export const ScrcpySetClipboardControlMessage1_21 = new Struct(
    {
        type: u8,
        sequence: u64,
        paste: u8.as<boolean>(),
        content: string(u32),
    },
    { littleEndian: false },
);

export type ScrcpySetClipboardControlMessage1_21 = StructInit<
    typeof ScrcpySetClipboardControlMessage1_21
>;

export class ScrcpyOptions1_21 extends ScrcpyOptions<ScrcpyOptionsInit1_21> {
    static readonly DEFAULTS = {
        ...ScrcpyOptions1_18.DEFAULTS,
        clipboardAutosync: true,
    } as const satisfies Required<ScrcpyOptionsInit1_21>;

    static serialize<T extends object>(
        options: T,
        defaults: Required<T>,
    ): string[] {
        // 1.21 changed the format of arguments
        const result: string[] = [];
        for (const [key, value] of Object.entries(options)) {
            const serializedValue = toScrcpyOptionValue(value, undefined);
            if (!serializedValue) {
                continue;
            }

            const defaultValue = toScrcpyOptionValue(
                defaults[key as keyof T],
                undefined,
            );
            if (serializedValue == defaultValue) {
                continue;
            }

            result.push(`${toSnakeCase(key)}=${serializedValue}`);
        }
        return result;
    }

    override get defaults(): Required<ScrcpyOptionsInit1_21> {
        return ScrcpyOptions1_21.DEFAULTS;
    }

    #clipboardAck = new Map<bigint, PromiseResolver<void>>();

    constructor(init: ScrcpyOptionsInit1_21) {
        super(ScrcpyOptions1_18, init, ScrcpyOptions1_21.DEFAULTS);
    }

    async #parseAckClipboardMessage(stream: AsyncExactReadable) {
        const message =
            await ScrcpyAckClipboardDeviceMessage.deserialize(stream);
        const resolver = this.#clipboardAck.get(message.sequence);
        if (resolver) {
            resolver.resolve();
            this.#clipboardAck.delete(message.sequence);
        }
    }

    #deviceMessageError: Error | undefined;

    override async parseDeviceMessage(
        id: number,
        stream: AsyncExactReadable,
    ): Promise<void> {
        try {
            switch (id) {
                case 1:
                    await this.#parseAckClipboardMessage(stream);
                    break;
                default:
                    await super.parseDeviceMessage(id, stream);
                    break;
            }
        } catch (e) {
            this.#deviceMessageError = e as Error;
            throw e;
        }
    }

    override async endDeviceMessageStream(e?: Error): Promise<void> {
        await super.endDeviceMessageStream(e);
        this.#deviceMessageError ??=
            e ?? new Error("Device message stream ended");
    }

    override serialize(): string[] {
        return ScrcpyOptions1_21.serialize(this.value, this.defaults);
    }

    override serializeSetClipboardControlMessage(
        message: ScrcpySetClipboardControlMessage,
    ): Uint8Array | [Uint8Array, Promise<void>] {
        if (message.sequence === 0n) {
            return ScrcpySetClipboardControlMessage1_21.serialize(message);
        }

        if (this.#deviceMessageError) {
            throw this.#deviceMessageError;
        }

        const resolver = new PromiseResolver<void>();
        this.#clipboardAck.set(message.sequence, resolver);
        return [
            ScrcpySetClipboardControlMessage1_21.serialize(message),
            resolver.promise,
        ];
    }
}
