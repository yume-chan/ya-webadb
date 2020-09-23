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

registerFieldTypeDefinition(undefined as unknown as FixedLengthArray, {
    type: FieldType.FixedLengthArray,

    async deserialize({ context, field, object, }) {
        const value: Array.BackingField = {
            buffer: await context.read(field.options.length),
        };

        switch (field.subType) {
            case Array.SubType.ArrayBuffer:
                break;
            case Array.SubType.String:
                value.string = context.decodeUtf8(value.buffer!);
                break;
            default:
                throw new Error('Unknown type');
        }

        Array.initialize(object, field, value);
    },

    getSize({ field }) {
        return field.options.length;
    },

    initialize({ field, init, object }) {
        Array.initialize(object, field, {});
        object[field.name] = init[field.name];
    },

    serialize({ context, dataView, field, object, offset }) {
        const backingField = Array.getBackingField(object, field.name);
        backingField.buffer ??=
            context.encodeUtf8(backingField.string!);

        new Uint8Array(dataView.buffer).set(
            new Uint8Array(backingField.buffer),
            offset
        );
    }
});
