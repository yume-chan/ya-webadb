import type { StructOptions, StructSerializationContext } from './context';
import type { StructFieldDefinition } from './definition';
import type { StructValue } from './struct-value';

/**
 * Field runtime value manages one field of one `Struct` instance.
 *
 * If one `StructFieldDefinition` needs to change other field's semantics
 * It can override other fields' `StructFieldValue` in its own `StructFieldValue`'s constructor
 */
export abstract class StructFieldValue<
    TDefinition extends StructFieldDefinition<any, any, any> = StructFieldDefinition<any, any, any>
    > {
    /** Gets the definition associated with this runtime value */
    public readonly definition: TDefinition;

    /** Gets the options of the associated `Struct` */
    public readonly options: Readonly<StructOptions>;

    /** Gets the serialization context of the associated `Struct` instance */
    public readonly context: StructSerializationContext;

    /** Gets the associated `Struct` instance */
    public readonly struct: StructValue;

    protected value: TDefinition['TValue'];

    public constructor(
        definition: TDefinition,
        options: Readonly<StructOptions>,
        context: StructSerializationContext,
        struct: StructValue,
        value: TDefinition['TValue'],
    ) {
        this.definition = definition;
        this.options = options;
        this.context = context;
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
     * When implemented in derived classes, returns the current value of this field
     */
    public get(): TDefinition['TValue'] {
        return this.value;
    }

    /**
     * When implemented in derived classes, update the current value of this field
     */
    public set(value: TDefinition['TValue']): void {
        this.value = value;
    }

    /**
     * When implemented in derived classes, serializes this field into `dataView` at `offset`
     */
    public abstract serialize(
        dataView: DataView,
        offset: number,
        context: StructSerializationContext
    ): void;
}
