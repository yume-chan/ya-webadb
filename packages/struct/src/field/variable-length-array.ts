import { getBackingField, setBackingField } from '../backing-field';
import { StructSerializationContext } from '../types';
import { Identity, placeholder } from '../utils';
import { Array } from './array';
import { registerFieldTypeDefinition } from './definition';
import { FieldDescriptorBaseOptions, FieldType } from './descriptor';

export namespace VariableLengthArray {
    export type TypeScriptTypeCanBeUndefined<
        TEmptyBehavior extends EmptyBehavior = EmptyBehavior
        > =
        TEmptyBehavior extends EmptyBehavior.Empty ? never :
        undefined;

    export type TypeScriptType<
        TType extends Array.SubType = Array.SubType,
        TEmptyBehavior extends EmptyBehavior = EmptyBehavior
        > =
        Identity<
            Array.TypeScriptType<TType> |
            TypeScriptTypeCanBeUndefined<TEmptyBehavior>
        >;

    export const enum EmptyBehavior {
        Undefined,
        Empty,
    }

    export type KeyOfType<TObject, TProperty> =
        {
            [TKey in keyof TObject]:
            TObject[TKey] extends TProperty ? TKey : never
        }[keyof TObject];

    export interface Options<
        TInit = object,
        TLengthField extends KeyOfType<TInit, number> = any,
        TEmptyBehavior extends EmptyBehavior = EmptyBehavior
        > extends FieldDescriptorBaseOptions {
        lengthField: TLengthField;

        emptyBehavior?: TEmptyBehavior;
    }

    export function getLengthBackingField(
        object: any,
        field: VariableLengthArray
    ): number | undefined {
        return getBackingField<number>(object, field.options.lengthField);
    }

    export function setLengthBackingField(
        object: any,
        field: VariableLengthArray,
        value: number | undefined
    ) {
        setBackingField(object, field.options.lengthField, value);
    }

    export function initialize(
        object: any,
        field: VariableLengthArray,
        value: Array.BackingField,
        context: StructSerializationContext,
    ): void {
        Array.initialize(object, field, value);
        const descriptor = Object.getOwnPropertyDescriptor(object, field.name)!;
        delete object[field.name];

        switch (field.subType) {
            case Array.SubType.ArrayBuffer:
                Object.defineProperty(object, field.name, {
                    ...descriptor,
                    set(buffer: ArrayBuffer | undefined) {
                        descriptor.set!.call(object, buffer);
                        setLengthBackingField(object, field, buffer?.byteLength ?? 0);
                    },
                });

                delete object[field.options.lengthField];
                Object.defineProperty(object, field.options.lengthField, {
                    configurable: true,
                    enumerable: true,
                    get() {
                        return getLengthBackingField(object, field);
                    }
                });
                break;
            case Array.SubType.String:
                Object.defineProperty(object, field.name, {
                    ...descriptor,
                    set(string: string | undefined) {
                        descriptor.set!.call(object, string);
                        if (string) {
                            setLengthBackingField(object, field, undefined);
                        } else {
                            setLengthBackingField(object, field, 0);
                        }
                    },
                });

                delete object[field.options.lengthField];
                Object.defineProperty(object, field.options.lengthField, {
                    configurable: true,
                    enumerable: true,
                    get() {
                        let value = getLengthBackingField(object, field);
                        if (value === undefined) {
                            const backingField = getBackingField<Array.BackingField>(object, field.name);
                            const buffer = context.encodeUtf8(backingField.string!);
                            backingField.buffer = buffer;

                            value = buffer.byteLength;
                            setLengthBackingField(object, field, value);
                        }
                        return value;
                    }
                });
                break;
            default:
                throw new Error('Unknown type');
        }
        setBackingField(object, field.name, value);
        if (value.buffer) {
            setLengthBackingField(object, field, value.buffer.byteLength);
        }
    }
}

export interface VariableLengthArray<
    TName extends string = string,
    TType extends Array.SubType = Array.SubType,
    TInit = object,
    TLengthField extends VariableLengthArray.KeyOfType<TInit, number> = any,
    TEmptyBehavior extends VariableLengthArray.EmptyBehavior = VariableLengthArray.EmptyBehavior,
    TTypeScriptType = VariableLengthArray.TypeScriptType<TType, TEmptyBehavior>,
    TOptions extends VariableLengthArray.Options<TInit, TLengthField, TEmptyBehavior> = VariableLengthArray.Options<TInit, TLengthField, TEmptyBehavior>
    > extends Array<
    TName,
    TType,
    Record<TName, TTypeScriptType>,
    Record<TName, TTypeScriptType> & Record<TLengthField, never>,
    TOptions
    > {
    type: FieldType.VariableLengthArray;

    options: TOptions;
}

registerFieldTypeDefinition(
    placeholder<VariableLengthArray>(),
    placeholder<ArrayBuffer>(),
    {
        type: FieldType.VariableLengthArray,

        async deserialize(
            { context, field, object }
        ): Promise<{ value: string | ArrayBuffer | undefined, extra?: ArrayBuffer; }> {
            const length = object[field.options.lengthField];
            if (length === 0) {
                if (field.options.emptyBehavior === VariableLengthArray.EmptyBehavior.Empty) {
                    switch (field.subType) {
                        case Array.SubType.ArrayBuffer:
                            return { value: new ArrayBuffer(0) };
                        case Array.SubType.String:
                            return { value: '', extra: new ArrayBuffer(0) };
                        default:
                            throw new Error('Unknown type');
                    }
                } else {
                    return { value: undefined };
                }
            }

            const buffer = await context.read(length);
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

        getSize() { return 0; },

        getDynamicSize({ field, object }) {
            return object[field.options.lengthField];
        },

        initialize({ context, extra, field, object, value }) {
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
            VariableLengthArray.initialize(object, field, backingField, context);
        },

        serialize({ dataView, field, object, offset }) {
            const backingField = getBackingField<Array.BackingField>(object, field.name);
            new Uint8Array(dataView.buffer).set(
                new Uint8Array(backingField.buffer!),
                offset
            );
        },
    }
);
