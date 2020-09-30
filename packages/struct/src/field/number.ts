import { placeholder } from '../utils';
import { registerFieldTypeDefinition } from './definition';
import { FieldDescriptorBase, FieldDescriptorBaseOptions, FieldType } from './descriptor';

export namespace Number {
    export type TypeScriptType<T extends SubType> =
        T extends SubType.Uint64 ? bigint : number;

    export const enum SubType {
        Uint16,
        Int32,
        Uint32,
        Uint64,
    }

    export const SizeMap: Record<SubType, number> = {
        [SubType.Uint16]: 2,
        [SubType.Int32]: 4,
        [SubType.Uint32]: 4,
        [SubType.Uint64]: 8,
    };

    export const DataViewGetterMap = {
        [SubType.Uint16]: 'getUint16',
        [SubType.Int32]: 'getInt32',
        [SubType.Uint32]: 'getUint32',
        [SubType.Uint64]: 'getBigUint64',
    } as const;

    export const DataViewSetterMap = {
        [SubType.Uint16]: 'setUint16',
        [SubType.Int32]: 'setInt32',
        [SubType.Uint32]: 'setUint32',
        [SubType.Uint64]: 'setBigUint64',
    } as const;
}

export interface Number<
    TName extends string = string,
    TSubType extends Number.SubType = Number.SubType,
    TTypeScriptType = Number.TypeScriptType<TSubType>,
    TOptions extends FieldDescriptorBaseOptions = FieldDescriptorBaseOptions
    > extends FieldDescriptorBase<
    TName,
    Record<TName, TTypeScriptType>,
    Record<TName, TTypeScriptType>,
    TOptions
    > {
    type: FieldType.Number;

    subType: TSubType;
}

registerFieldTypeDefinition(
    placeholder<Number>(),
    undefined,
    {
        type: FieldType.Number,

        getSize({ field }) {
            return Number.SizeMap[field.subType];
        },

        async deserialize({ context, field, options }) {
            const buffer = await context.read(Number.SizeMap[field.subType]);
            const view = new DataView(buffer);
            const value = view[Number.DataViewGetterMap[field.subType]](
                0,
                options.littleEndian
            );
            return { value };
        },

        serialize({ dataView, field, object, offset, options }) {
            (dataView[Number.DataViewSetterMap[field.subType]] as any)(
                offset,
                object[field.name],
                options.littleEndian
            );
        },
    }
);
