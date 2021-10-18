import type { StructFieldValue } from './field-value';

/**
 * Manages the initialization process of a struct value
 */
export class StructValue {
    /** @internal */ readonly fieldValues: Record<PropertyKey, StructFieldValue> = {};

    /**
     * Gets the result struct value object
     */
    readonly value: Record<PropertyKey, unknown> = {};

    /**
     * Sets a `StructFieldValue` for `key`
     *
     * @param key The field name
     * @param value The associated `StructFieldValue`
     */
    set(key: PropertyKey, value: StructFieldValue): void {
        this.fieldValues[key] = value;

        Object.defineProperty(this.value, key, {
            configurable: true,
            enumerable: true,
            get() { return value.get(); },
            set(v) { value.set(v); },
        });
    }

    /**
     * Gets a previously `StructFieldValue` for `key`
     *
     * @param key The field name
     */
    get(key: PropertyKey): StructFieldValue {
        return this.fieldValues[key];
    }
}
