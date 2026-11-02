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
        throw new TypeError(`Invalid option value: ${JSON.stringify(value)}`);
    }

    return value.toString();
}
