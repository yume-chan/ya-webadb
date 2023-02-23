import type { StructFieldDefinition } from "./definition.js";
import type { StructOptions } from "./options.js";
import type { StructValue } from "./struct-value.js";

/**
 * A field value defines how to serialize a field.
 *
 * It may contains extra metadata about the value which are essential or
 * helpful for the serialization process.
 */
export abstract class StructFieldValue<
    TDefinition extends StructFieldDefinition<
        any,
        any,
        any
    > = StructFieldDefinition<any, any, any>
> {
    /** Gets the definition associated with this runtime value */
    public readonly definition: TDefinition;

    /** Gets the options of the associated `Struct` */
    public readonly options: Readonly<StructOptions>;

    /** Gets the associated `Struct` instance */
    public readonly struct: StructValue;

    public get hasCustomAccessors(): boolean {
        return (
            this.get !== StructFieldValue.prototype.get ||
            this.set !== StructFieldValue.prototype.set
        );
    }

    protected value: TDefinition["TValue"];

    public constructor(
        definition: TDefinition,
        options: Readonly<StructOptions>,
        struct: StructValue,
        value: TDefinition["TValue"]
    ) {
        this.definition = definition;
        this.options = options;
        this.struct = struct;
        this.value = value;
    }

    /**
     * Gets size of this field. By default, it returns its `definition`'s size.
     *
     * When overridden in derived classes, can have custom logic to calculate the actual size.
     */
    public getSize(): number {
        return this.definition.getSize();
    }

    /**
     * When implemented in derived classes, reads current field's value.
     */
    public get(): TDefinition["TValue"] {
        return this.value;
    }

    /**
     * When implemented in derived classes, updates current field's value.
     */
    public set(value: TDefinition["TValue"]): void {
        this.value = value;
    }

    /**
     * When implemented in derived classes, serializes this field into `dataView` at `offset`
     */
    public abstract serialize(dataView: DataView, offset: number): void;
}
