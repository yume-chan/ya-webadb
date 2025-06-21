import type { ScrcpyControlMessageType, ScrcpyOptions } from "../base/index.js";

/**
 * Scrcpy control message types have different values between versions.
 *
 * This class provides a way to get the actual value for a given type.
 */
export class ScrcpyControlMessageTypeMap {
    #types: readonly ScrcpyControlMessageType[];

    constructor(options: ScrcpyOptions<object>) {
        this.#types = options.controlMessageTypes;
    }

    get(type: ScrcpyControlMessageType): number {
        const value = this.#types.indexOf(type);
        if (value === -1) {
            throw new TypeError("Invalid or unsupported control message type");
        }
        return value;
    }

    fillMessageType<T extends { type: number }>(
        message: Omit<T, "type">,
        type: ScrcpyControlMessageType,
    ): T {
        (message as T).type = this.get(type);
        return message as T;
    }
}
