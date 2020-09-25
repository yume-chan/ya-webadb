import { FieldDescriptorBase, FieldType } from './descriptor';

export interface StructSerializationContext {
    encodeUtf8(input: string): ArrayBuffer;
}

export interface StructDeserializationContext extends StructSerializationContext {
    decodeUtf8(buffer: ArrayBuffer): string;

    read(length: number): ArrayBuffer | Promise<ArrayBuffer>;
}

export interface StructOptions {
    littleEndian: boolean;
}

export interface FieldTypeDefinition<
    TDescriptor extends FieldDescriptorBase = FieldDescriptorBase,
    > {
    type: FieldType | string;

    deserialize(options: {
        context: StructDeserializationContext;
        field: TDescriptor;
        object: any;
        options: StructOptions;
    }): Promise<void>;

    getSize(options: {
        field: TDescriptor;
        options: StructOptions;
    }): number;

    getDynamicSize?(options: {
        context: StructSerializationContext,
        field: TDescriptor,
        object: any,
        options: StructOptions,
    }): number;

    initialize?(options: {
        context: StructSerializationContext;
        field: TDescriptor;
        init: any;
        object: any;
        options: StructOptions;
    }): void;

    serialize(options: {
        context: StructSerializationContext;
        dataView: DataView;
        field: TDescriptor;
        object: any;
        offset: number;
        options: StructOptions;
    }): void;
}

const registry: Record<number | string, FieldTypeDefinition> = {};

export function getFieldTypeDefinition(type: FieldType | string): FieldTypeDefinition {
    return registry[type];
}

export function registerFieldTypeDefinition<
    TDescriptor extends FieldDescriptorBase,
    TDefinition extends FieldTypeDefinition<TDescriptor>
>(
    _field: TDescriptor,
    methods: TDefinition
): void {
    registry[methods.type] = methods;
}
