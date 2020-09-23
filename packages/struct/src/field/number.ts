import { registerFieldTypeDefinition } from './definition';
import { FieldDescriptorBase, FieldDescriptorBaseOptions, FieldType } from './descriptor';

export namespace Number {
    export type TypeScriptType = number;

    export const enum SubType {
        Int32,
        Uint32,
    }

    export const SizeMap: Record<SubType, number> = {
        [SubType.Int32]: 4,
        [SubType.Uint32]: 4,
    };

    export const DataViewGetterMap = {
        [SubType.Int32]: 'getInt32',
        [SubType.Uint32]: 'getUint32',
    } as const;

    export const DataViewSetterMap = {
        [SubType.Int32]: 'setInt32',
        [SubType.Uint32]: 'setUint32',
    } as const;
}

export interface Number<
    TName extends string = string,
    TTypeScriptType = Number.TypeScriptType,
    TOptions extends FieldDescriptorBaseOptions = FieldDescriptorBaseOptions
    > extends FieldDescriptorBase<
    TName,
    Record<TName, TTypeScriptType>,
    Record<TName, TTypeScriptType>,
    TOptions
    > {
    type: FieldType.Number;

    subType: Number.SubType;
}

registerFieldTypeDefinition(undefined as unknown as Number, {
    type: FieldType.Number,

    getSize({ field }) {
        return Number.SizeMap[field.subType];
    },

    async deserialize({ context, field, object, options }) {
        const buffer = await context.read(Number.SizeMap[field.subType]);
        const view = new DataView(buffer);
        object[field.name] = view[Number.DataViewGetterMap[field.subType]](
            0,
            options.littleEndian
        );
    },

    serialize({ dataView, field, object, offset, options }) {
        dataView[Number.DataViewSetterMap[field.subType]](
            offset,
            object[field.name],
            options.littleEndian
        );
    },
});
