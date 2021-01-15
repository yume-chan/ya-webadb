import type { StructFieldValue } from './field-value';

/**
 * Manages the initialization process of a struct value
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
        // TODO: TypeScript 4.2 will allow this behavior
        // https://github.com/microsoft/TypeScript/pull/26797
        // @ts-expect-error Type 'symbol' cannot be used as an index type. ts(2538)
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
    public get(key: PropertyKey): StructFieldValue {
        // TODO: TypeScript 4.2 will allow this behavior
        // https://github.com/microsoft/TypeScript/pull/26797
        // @ts-expect-error Type 'symbol' cannot be used as an index type. ts(2538)
        return this.fieldValues[key];
    }
}
