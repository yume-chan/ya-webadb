import type { StructDeserializationContext, StructOptions, StructSerializationContext } from './context';
import type { FieldDescriptorBase } from './descriptor';

export abstract class FieldRuntimeValue<TDescriptor extends FieldDescriptorBase = FieldDescriptorBase> {
    public readonly descriptor: TDescriptor;

    public readonly options: Readonly<StructOptions>;

    public readonly context: StructSerializationContext;

    public constructor(
        descriptor: TDescriptor,
        options: Readonly<StructOptions>,
        context: StructSerializationContext,
        object: any,
    ) {
        this.descriptor = descriptor;
        this.options = options;
        this.context = context;
    }

    public abstract deserialize(context: StructDeserializationContext, object: any): void | Promise<void>;

    public getSize(): number {
        const Constructor = Object.getPrototypeOf(this).constructor as FieldRuntimeType<TDescriptor>;
        return Constructor.getSize(this.descriptor, this.options);
    }

    public abstract get(): unknown;

    public abstract set(value: unknown): void;

    public abstract serialize(dataView: DataView, offset: number, context: StructSerializationContext): void;
}

export interface FieldRuntimeType<TDescriptor extends FieldDescriptorBase = FieldDescriptorBase> {
    new(
        descriptor: TDescriptor,
        options: Readonly<StructOptions>,
        context: StructSerializationContext,
        object: any,
    ): FieldRuntimeValue<TDescriptor>;

    getSize(descriptor: TDescriptor, options: Readonly<StructOptions>): number;
}
