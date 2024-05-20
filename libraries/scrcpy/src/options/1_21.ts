// cspell: ignore autosync

import { PromiseResolver } from "@yume-chan/async";
import type { AsyncExactReadable } from "@yume-chan/struct";
import Struct, { placeholder } from "@yume-chan/struct";

import type { ScrcpySetClipboardControlMessage } from "../control/index.js";

import type { ScrcpyOptionsInit1_18 } from "./1_18.js";
import { ScrcpyOptions1_18 } from "./1_18.js";
import { ScrcpyOptionsBase, toScrcpyOptionValue } from "./types.js";

export const ScrcpyAckClipboardDeviceMessage = new Struct().uint64("sequence");

export interface ScrcpyOptionsInit1_21 extends ScrcpyOptionsInit1_18 {
    clipboardAutosync?: boolean;
}

function toSnakeCase(input: string): string {
    return input.replace(/([A-Z])/g, "_$1").toLowerCase();
}

export const ScrcpySetClipboardControlMessage1_21 = new Struct()
    .uint8("type")
    .uint64("sequence")
    .int8("paste", placeholder<boolean>())
    .uint32("length")
    .string("content", { lengthField: "length" });

export type ScrcpySetClipboardControlMessage1_21 =
    (typeof ScrcpySetClipboardControlMessage1_21)["TInit"];

export class ScrcpyOptions1_21 extends ScrcpyOptionsBase<
    ScrcpyOptionsInit1_21,
    ScrcpyOptions1_18
> {
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
        super(new ScrcpyOptions1_18(init), {
            ...ScrcpyOptions1_21.DEFAULTS,
            ...init,
        });
    }

    override async parseDeviceMessage(
        id: number,
        stream: AsyncExactReadable,
    ): Promise<boolean> {
        switch (id) {
            case 1: {
                const message =
                    await ScrcpyAckClipboardDeviceMessage.deserialize(stream);
                const resolver = this.#clipboardAck.get(message.sequence);
                if (resolver) {
                    resolver.resolve();
                    this.#clipboardAck.delete(message.sequence);
                }
                return true;
            }
            default:
                return await super.parseDeviceMessage(id, stream);
        }
    }

    override serialize(): string[] {
        return ScrcpyOptions1_21.serialize(this.value, this.defaults);
    }

    override serializeSetClipboardControlMessage(
        message: ScrcpySetClipboardControlMessage,
    ): [Uint8Array, Promise<void> | undefined] {
        if (message.sequence === 0n) {
            return [
                ScrcpySetClipboardControlMessage1_21.serialize(message),
                undefined,
            ];
        }

        const resolver = new PromiseResolver<void>();
        this.#clipboardAck.set(message.sequence, resolver);
        return [
            ScrcpySetClipboardControlMessage1_21.serialize(message),
            resolver.promise,
        ];
    }
}
