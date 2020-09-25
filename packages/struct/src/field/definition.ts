import { StructDeserializationContext, StructOptions, StructSerializationContext } from '../types';
import { FieldDescriptorBase, FieldType } from './descriptor';

export interface FieldTypeDefinition<
    TDescriptor extends FieldDescriptorBase = FieldDescriptorBase,
    TInitExtra = undefined,
    > {
    type: FieldType | string;

    deserialize(options: {
        context: StructDeserializationContext;
        field: TDescriptor;
        object: any;
        options: StructOptions;
    }): Promise<{ value: any; extra?: TInitExtra; }>;

    getSize(options: {
        field: TDescriptor;
        options: StructOptions;
    }): number;

    getDynamicSize?(options: {
        context: StructSerializationContext;
        field: TDescriptor;
        object: any;
        options: StructOptions;
    }): number;

    initialize?(options: {
        context: StructSerializationContext;
        field: TDescriptor;
        value: any;
        extra?: TInitExtra;
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

const registry: Record<number | string, FieldTypeDefinition<any, any>> = {};

export function getFieldTypeDefinition(type: FieldType | string): FieldTypeDefinition<any, any> {
    return registry[type];
}

export function registerFieldTypeDefinition<
    TDescriptor extends FieldDescriptorBase,
    TInitExtra,
    TDefinition extends FieldTypeDefinition<TDescriptor, TInitExtra>
>(
    _field: TDescriptor,
    _initExtra: TInitExtra,
    methods: TDefinition
): void {
    registry[methods.type] = methods;
}
