import type { StructFieldValue } from "./field-value.js";

export const STRUCT_VALUE_SYMBOL = Symbol("struct-value");

/**
 * A struct value is a map between keys in a struct and their field values.
 */
export class StructValue {
    /** @internal */ readonly fieldValues: Record<
        PropertyKey,
        StructFieldValue
    > = {};

    /**
     * Gets the result struct value object
     */
    public readonly value: Record<PropertyKey, unknown>;

    public constructor(prototype: object) {
        // PERF: `Object.create(extra)` is 50% faster
        // than `Object.defineProperties(this.value, extra)`
        this.value = Object.create(prototype) as Record<PropertyKey, unknown>;

        // PERF: `Object.defineProperty` is slow
        // but we need it to be non-enumerable
        Object.defineProperty(this.value, STRUCT_VALUE_SYMBOL, {
            enumerable: false,
            value: this,
        });
    }

    /**
     * Sets a `StructFieldValue` for `key`
     *
     * @param name The field name
     * @param fieldValue The associated `StructFieldValue`
     */
    public set(name: PropertyKey, fieldValue: StructFieldValue): void {
        this.fieldValues[name] = fieldValue;

        // PERF: `Object.defineProperty` is slow
        // use normal property when possible
        if (fieldValue.hasCustomAccessors) {
            Object.defineProperty(this.value, name, {
                configurable: true,
                enumerable: true,
                get() {
                    return fieldValue.get();
                },
                set(v) {
                    fieldValue.set(v);
                },
            });
        } else {
            this.value[name] = fieldValue.get();
        }
    }

    /**
     * Gets the `StructFieldValue` for `key`
     *
     * @param name The field name
     */
    public get(name: PropertyKey): StructFieldValue {
        return this.fieldValues[name]!;
    }
}
