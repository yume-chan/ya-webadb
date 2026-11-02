import { toScrcpyOptionValue } from "../../base/option-value.js";

function toSnakeCase(input: string): string {
    return input.replace(/([A-Z])/g, "_$1").toLowerCase();
}

// 1.21 changed the format of arguments
export function serialize<T extends object, TDefaults extends object>(
    options: T,
    defaults: TDefaults,
): string[] {
    const result: string[] = [];
    for (const [key, value] of Object.entries(options)) {
        const serializedValue = toScrcpyOptionValue(value, undefined);
        // v3.0 `new_display` option needs to send empty strings to server
        if (serializedValue === undefined) {
            continue;
        }

        const defaultValue = toScrcpyOptionValue(
            defaults[key as keyof TDefaults],
            undefined,
        );
        if (serializedValue === defaultValue) {
            continue;
        }

        result.push(`${toSnakeCase(key)}=${serializedValue}`);
    }
    return result;
}
