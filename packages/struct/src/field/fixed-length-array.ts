import { getBackingField } from '../backing-field';
import { placeholder } from '../utils';
import { Array } from './array';
import { registerFieldTypeDefinition } from './definition';
import { FieldDescriptorBaseOptions, FieldType } from './descriptor';

export namespace FixedLengthArray {
    export interface Options extends FieldDescriptorBaseOptions {
        length: number;
    }
}

export interface FixedLengthArray<
    TName extends string = string,
    TType extends Array.SubType = Array.SubType,
    TTypeScriptType = Array.TypeScriptType<TType>,
    TOptions extends FixedLengthArray.Options = FixedLengthArray.Options
    > extends Array<
    TName,
    TType,
    Record<TName, TTypeScriptType>,
    Record<TName, TTypeScriptType>,
    TOptions
    > {
    type: FieldType.FixedLengthArray;

    options: TOptions;
};

registerFieldTypeDefinition(
    placeholder<FixedLengthArray>(),
    placeholder<ArrayBuffer>(),
    {
        type: FieldType.FixedLengthArray,

        async deserialize(
            { context, field }
        ): Promise<{ value: string | ArrayBuffer, extra?: ArrayBuffer; }> {
            const buffer = await context.read(field.options.length);

            switch (field.subType) {
                case Array.SubType.ArrayBuffer:
                    return { value: buffer };
                case Array.SubType.String:
                    return {
                        value: context.decodeUtf8(buffer),
                        extra: buffer
                    };
                default:
                    throw new Error('Unknown type');
            }
        },

        getSize({ field }) {
            return field.options.length;
        },

        initialize({ extra, field, object, value }) {
            const backingField: Array.BackingField = {};
            if (typeof value === 'string') {
                backingField.string = value;
                if (extra) {
                    backingField.buffer = extra;
                }
            } else {
                backingField.buffer = value;
            }
            Array.initialize(object, field, backingField);
        },

        serialize({ context, dataView, field, object, offset }) {
            const backingField = getBackingField<Array.BackingField>(object, field.name);
            backingField.buffer ??=
                context.encodeUtf8(backingField.string!);

            new Uint8Array(dataView.buffer).set(
                new Uint8Array(backingField.buffer),
                offset
            );
        }
    }
);
