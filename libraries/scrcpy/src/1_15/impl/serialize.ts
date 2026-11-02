import { toScrcpyOptionValue } from "../../base/index.js";

export function serialize<T>(options: T, order: readonly (keyof T)[]) {
    return order.map((key) => toScrcpyOptionValue(options[key], "-"));
}
