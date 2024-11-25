import { toScrcpyOptionValue } from "../../base/option-value.js";

function toSnakeCase(input: string): string {
    return input.replace(/([A-Z])/g, "_$1").toLowerCase();
}

export function serialize<T extends object>(
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
