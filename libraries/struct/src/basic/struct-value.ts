import type { StructFieldValue } from "./field-value.js";

/**
 * A struct value is a map between keys in a struct and their field values.
 */
export class StructValue {
    /** @internal */ readonly fieldValues: Record<PropertyKey, StructFieldValue> = {};

    /**
     * Gets the result struct value object
     */
    public readonly value: Record<PropertyKey, unknown> = {};

    /**
     * Sets a `StructFieldValue` for `key`
     *
     * @param key The field name
     * @param value The associated `StructFieldValue`
     */
    public set(key: PropertyKey, value: StructFieldValue): void {
        this.fieldValues[key] = value;

        Object.defineProperty(this.value, key, {
            configurable: true,
            enumerable: true,
            get() { return value.get(); },
            set(v) { value.set(v); },
        });
    }

    /**
     * Gets the `StructFieldValue` for `key`
     *
     * @param key The field name
     */
    public get(key: PropertyKey): StructFieldValue {
        return this.fieldValues[key]!;
    }
}
