import { BackingField, FieldDescriptorBase, FieldDescriptorBaseOptions } from './descriptor';

export namespace Array {
    export const enum SubType {
        ArrayBuffer,
        String,
    }

    export type TypeScriptType<TType extends SubType = SubType> =
        TType extends SubType.ArrayBuffer ? ArrayBuffer :
        TType extends SubType.String ? string :
        ArrayBuffer | string;

    export interface BackingField {
        buffer?: ArrayBuffer;

        string?: string;
    }

    export function getBackingField(object: any, name: string): BackingField {
        return object[BackingField][name];
    }

    export function setBackingField(object: any, name: string, value: BackingField): void {
        object[BackingField][name] = value;
    }

    export function initialize(object: any, field: Array, value: BackingField): void {
        switch (field.subType) {
            case SubType.ArrayBuffer:
                Object.defineProperty(object, field.name, {
                    configurable: true,
                    enumerable: true,
                    get(): ArrayBuffer {
                        return getBackingField(object, field.name).buffer!;
                    },
                    set(buffer: ArrayBuffer) {
                        setBackingField(object, field.name, { buffer });
                    },
                });
                break;
            case SubType.String:
                Object.defineProperty(object, field.name, {
                    configurable: true,
                    enumerable: true,
                    get(): string {
                        return getBackingField(object, field.name).string!;
                    },
                    set(string: string) {
                        setBackingField(object, field.name, { string });
                    },
                });
                break;
            default:
                throw new Error('Unknown type');
        }
        setBackingField(object, field.name, value);
    }
}

export interface Array<
    TName extends string = string,
    TType extends Array.SubType = Array.SubType,
    TResultObject = {},
    TInitObject = {},
    TOptions extends FieldDescriptorBaseOptions = FieldDescriptorBaseOptions
    > extends FieldDescriptorBase<
    TName,
    TResultObject,
    TInitObject,
    TOptions
    > {
    subType: TType;
}
