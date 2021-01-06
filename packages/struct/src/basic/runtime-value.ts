import type { StructDeserializationContext, StructOptions, StructSerializationContext } from './context';
import type { FieldDefinition } from './definition';

/**
 * Field runtime value manages one field of one `Struct` instance.
 *
 * If one `FieldDefinition` needs to change other field's semantics
 * It can override other fields' `FieldRuntimeValue` in its own `FieldRuntimeValue`'s constructor
 */
export abstract class FieldRuntimeValue<
    TDefinition extends FieldDefinition<any, any, any> = FieldDefinition<any, any, any>
    > {
    /** Gets the definition associated with this runtime value */
    public readonly definition: TDefinition;

    /** Gets the options of the associated `Struct` */
    public readonly options: Readonly<StructOptions>;

    /** Gets the serialization context of the associated `Struct` instance */
    public readonly context: StructSerializationContext;

    /** Gets the associated `Struct` instance */
    public readonly object: any;

    public constructor(
        definition: TDefinition,
        options: Readonly<StructOptions>,
        context: StructSerializationContext,
        object: any,
    ) {
        this.definition = definition;
        this.options = options;
        this.context = context;
        this.object = object;
    }

    /** When implemented in derived classes, deserialize this field from the specified `context` */
    public abstract deserialize(
        context: StructDeserializationContext
    ): void | Promise<void>;

    /**
     * Gets the actual size of this field. By default, the return value of its `definition.getSize()`
     *
     * When overridden in derived classes, can have custom logic to calculate the actual size.
     */
    public getSize(): number {
        return this.definition.getSize();
    }

    /**
     * When implemented in derived classes, returns the current value of this field
     */
    public abstract get(): unknown;

    /**
     * When implemented in derived classes, update the current value of this field
     */
    public abstract set(value: unknown): void;

    /**
     * When implemented in derived classes, serializes this field into `dataView` at `offset`
     */
    public abstract serialize(
        dataView: DataView,
        offset: number,
        context: StructSerializationContext
    ): void;
}
