import { FieldDefinition, FieldRuntimeValue, StructDeserializationContext, StructSerializationContext } from '../basic';

/**
 * Base class for all types that
 * can be converted from an ArrayBuffer when deserialized,
 * and need to be converted to an ArrayBuffer when serializing
 *
 * @template TType The actual TypeScript type of this type
 * @template TTypeScriptType Optional another type (should be compatible with `TType`)
 * specified by user when creating field definitions.
 */
export abstract class ArrayBufferLikeFieldType<TType = unknown, TTypeScriptType = TType> {
    public readonly valueType!: TTypeScriptType;

    /**
     * When implemented in derived classes, converts the type-specific `value` to an `ArrayBuffer`
     *
     * This function should be "pure", i.e.,
     * same `value` should always be converted to `ArrayBuffer`s that have same content.
     */
    public abstract toArrayBuffer(value: TType, context: StructSerializationContext): ArrayBuffer;

    /** When implemented in derived classes, converts the `ArrayBuffer` to a type-specific value */
    public abstract fromArrayBuffer(arrayBuffer: ArrayBuffer, context: StructDeserializationContext): TType;

    /**
     * When implemented in derived classes, gets the size in byte of the type-specific `value`.
     *
     * If the size can't be calculated without first converting the `value` back to an `ArrayBuffer`,
     * implementer should returns `-1` so the caller will get its size by first converting it to
     * an `ArrayBuffer` (and cache the result).
     */
    public abstract getSize(value: TType): number;
}

/** An ArrayBufferLike type that's actually an `ArrayBuffer` */
export class ArrayBufferFieldType extends ArrayBufferLikeFieldType<ArrayBuffer> {
    public static readonly instance = new ArrayBufferFieldType();

    protected constructor() {
        super();
    }

    public toArrayBuffer(value: ArrayBuffer): ArrayBuffer {
        return value;
    }

    public fromArrayBuffer(arrayBuffer: ArrayBuffer): ArrayBuffer {
        return arrayBuffer;
    }

    public getSize(value: ArrayBuffer): number {
        return value.byteLength;
    }
}

/** Am ArrayBufferLike type that converts to/from the `ArrayBuffer` from/to a `Uint8ClampedArray` */
export class Uint8ClampedArrayFieldType
    extends ArrayBufferLikeFieldType<Uint8ClampedArray, Uint8ClampedArray> {
    public static readonly instance = new Uint8ClampedArrayFieldType();

    protected constructor() {
        super();
    }

    public toArrayBuffer(value: Uint8ClampedArray): ArrayBuffer {
        return value.buffer;
    }

    public fromArrayBuffer(arrayBuffer: ArrayBuffer): Uint8ClampedArray {
        return new Uint8ClampedArray(arrayBuffer);
    }

    public getSize(value: Uint8ClampedArray): number {
        return value.byteLength;
    }
}

/** Am ArrayBufferLike type that converts to/from the `ArrayBuffer` from/to a `string` */
export class StringFieldType<TTypeScriptType = string>
    extends ArrayBufferLikeFieldType<string, TTypeScriptType> {
    public static readonly instance = new StringFieldType();

    public toArrayBuffer(value: string, context: StructSerializationContext): ArrayBuffer {
        return context.encodeUtf8(value);
    }

    public fromArrayBuffer(arrayBuffer: ArrayBuffer, context: StructDeserializationContext): string {
        return context.decodeUtf8(arrayBuffer);
    }

    public getSize(): number {
        // Return `-1`, so `ArrayBufferLikeFieldDefinition` will
        // convert this `value` into an `ArrayBuffer` (and cache the result),
        // Then get the size from that `ArrayBuffer`
        return -1;
    }
}

export abstract class ArrayBufferLikeFieldDefinition<
    TType extends ArrayBufferLikeFieldType = ArrayBufferLikeFieldType,
    TOptions = void,
    TRemoveFields = never,
    > extends FieldDefinition<
    TOptions,
    TType['valueType'],
    TRemoveFields
    >{
    public readonly type: TType;

    public constructor(type: TType, options: TOptions) {
        super(options);
        this.type = type;
    }
}

const EmptyArrayBuffer = new ArrayBuffer(0);

export abstract class ArrayBufferLikeFieldRuntimeValue<
    TDefinition extends ArrayBufferLikeFieldDefinition<any, any, any>,
    > extends FieldRuntimeValue<TDefinition> {
    protected arrayBuffer: ArrayBuffer | undefined;

    protected typedValue: unknown;

    protected getDeserializeSize(): number {
        return this.getSize();
    }

    public async deserialize(context: StructDeserializationContext): Promise<void> {
        const size = this.getDeserializeSize();

        this.arrayBuffer = undefined;
        this.typedValue = undefined;

        if (size === 0) {
            this.arrayBuffer = EmptyArrayBuffer;
        } else {
            this.arrayBuffer = await context.read(size);
        }

        this.typedValue = this.definition.type.fromArrayBuffer(this.arrayBuffer, context);
    }

    public get(): unknown {
        return this.typedValue;
    }

    public set(value: unknown): void {
        this.typedValue = value;
        this.arrayBuffer = undefined;
    }

    public serialize(dataView: DataView, offset: number, context: StructSerializationContext): void {
        if (!this.arrayBuffer) {
            this.arrayBuffer = this.definition.type.toArrayBuffer(this.typedValue, context);
        }

        new Uint8Array(dataView.buffer)
            .set(new Uint8Array(this.arrayBuffer!), offset);
    }
}
