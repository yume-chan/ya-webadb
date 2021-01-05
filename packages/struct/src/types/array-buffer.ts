import { FieldDescriptorBase, FieldDescriptorBaseOptions, FieldRuntimeValue, StructDeserializationContext, StructSerializationContext } from '../runtime';

export namespace ArrayBufferLikeFieldDescriptor {
    export enum SubType {
        ArrayBuffer,
        Uint8ClampedArray,
        String,
    }

    export type TypeScriptType<TType extends SubType = SubType> =
        TType extends SubType.ArrayBuffer ? ArrayBuffer :
        TType extends SubType.Uint8ClampedArray ? Uint8ClampedArray :
        TType extends SubType.String ? string :
        never;
}

export interface ArrayBufferLikeFieldDescriptor<
    TName extends string = string,
    TType extends ArrayBufferLikeFieldDescriptor.SubType = ArrayBufferLikeFieldDescriptor.SubType,
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

const EmptyArrayBuffer = new ArrayBuffer(0);
const EmptyUint8ClampedArray = new Uint8ClampedArray(EmptyArrayBuffer);
const EmptyString = '';

export abstract class ArrayBufferLikeFieldRuntimeValue<TDescriptor extends ArrayBufferLikeFieldDescriptor>
    extends FieldRuntimeValue<TDescriptor> {
    protected arrayBuffer: ArrayBuffer | undefined;

    protected typedArray: ArrayBufferView | undefined;

    protected string: string | undefined;

    protected getDeserializeSize(object: any): number {
        return this.getSize();
    }

    public async deserialize(context: StructDeserializationContext, object: any): Promise<void> {
        const size = this.getDeserializeSize(object);

        this.arrayBuffer = undefined;
        this.typedArray = undefined;
        this.string = undefined;

        if (size === 0) {
            this.arrayBuffer = EmptyArrayBuffer;
            switch (this.descriptor.subType) {
                case ArrayBufferLikeFieldDescriptor.SubType.Uint8ClampedArray:
                    this.typedArray = EmptyUint8ClampedArray;
                    break;
                case ArrayBufferLikeFieldDescriptor.SubType.String:
                    this.string = EmptyString;
                    break;
            }
            return;
        }

        const buffer = await context.read(size);
        switch (this.descriptor.subType) {
            case ArrayBufferLikeFieldDescriptor.SubType.ArrayBuffer:
                this.arrayBuffer = buffer;
                break;
            case ArrayBufferLikeFieldDescriptor.SubType.Uint8ClampedArray:
                this.arrayBuffer = buffer;
                this.typedArray = new Uint8ClampedArray(buffer);
                break;
            case ArrayBufferLikeFieldDescriptor.SubType.String:
                this.arrayBuffer = buffer;
                this.string = context.decodeUtf8(buffer);
                break;
            default:
                throw new Error('Unknown type');
        }
    }

    public get(): unknown {
        switch (this.descriptor.subType) {
            case ArrayBufferLikeFieldDescriptor.SubType.ArrayBuffer:
                return this.arrayBuffer;
            case ArrayBufferLikeFieldDescriptor.SubType.Uint8ClampedArray:
                return this.typedArray;
            case ArrayBufferLikeFieldDescriptor.SubType.String:
                return this.string;
            default:
                throw new Error('Unknown type');
        }
    }

    public set(value: unknown): void {
        this.arrayBuffer = undefined;
        this.typedArray = undefined;
        this.string = undefined;

        switch (this.descriptor.subType) {
            case ArrayBufferLikeFieldDescriptor.SubType.ArrayBuffer:
                this.arrayBuffer = value as ArrayBuffer;
                break;
            case ArrayBufferLikeFieldDescriptor.SubType.Uint8ClampedArray:
                this.typedArray = value as Uint8ClampedArray;
                this.arrayBuffer = this.typedArray.buffer;
                break;
            case ArrayBufferLikeFieldDescriptor.SubType.String:
                this.string = value as string;
                break;
            default:
                throw new Error('Unknown type');
        }
    }

    public serialize(dataView: DataView, offset: number, context: StructSerializationContext): void {
        if (this.descriptor.subType !== ArrayBufferLikeFieldDescriptor.SubType.ArrayBuffer &&
            !this.arrayBuffer) {
            switch (this.descriptor.subType) {
                case ArrayBufferLikeFieldDescriptor.SubType.Uint8ClampedArray:
                    this.arrayBuffer = this.typedArray!.buffer;
                    break;
                case ArrayBufferLikeFieldDescriptor.SubType.String:
                    this.arrayBuffer = context.encodeUtf8(this.string!);
                    break;
                default:
                    throw new Error('Unknown type');
            }
        }

        new Uint8Array(dataView.buffer)
            .set(new Uint8Array(this.arrayBuffer!), offset);
    }
}
