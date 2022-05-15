import { StructFieldValue } from "./field-value.js";

export const STRUCT_VALUE_SYMBOL = Symbol("struct-value");

/**
 * A struct value is a map between keys in a struct and their field values.
 */
export class StructValue {
    /** @internal */ readonly fieldValues: Record<PropertyKey, StructFieldValue> = {};

    /**
     * Gets the result struct value object
     */
    public readonly value: Record<PropertyKey, unknown> = {};

    public constructor() {
        Object.defineProperty(
            this.value,
            STRUCT_VALUE_SYMBOL,
            { enumerable: false, value: this }
        );
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
        if (fieldValue.get !== StructFieldValue.prototype.get ||
            fieldValue.set !== StructFieldValue.prototype.set) {
            Object.defineProperty(this.value, name, {
                configurable: true,
                enumerable: true,
                get() { return fieldValue.get(); },
                set(v) { fieldValue.set(v); },
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
