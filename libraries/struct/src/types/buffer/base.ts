// cspell: ignore syncbird

import { StructAsyncDeserializeStream, StructDeserializeStream, StructFieldDefinition, StructFieldValue, StructOptions, StructValue } from '../../basic';
import { Syncbird } from "../../syncbird";
import { decodeUtf8, encodeUtf8, ValueOrPromise } from "../../utils";

/**
 * Base class for all types that
 * can be converted from an ArrayBuffer when deserialized,
 * and need to be converted to an ArrayBuffer when serializing
 *
 * @template TValue The actual TypeScript type of this type
 * @template TTypeScriptType Optional another type (should be compatible with `TType`)
 * specified by user when creating field definitions.
 */
export abstract class BufferFieldSubType<TValue = unknown, TTypeScriptType = TValue> {
    public readonly TTypeScriptType!: TTypeScriptType;

    /**
     * When implemented in derived classes, converts the type-specific `value` to an `ArrayBuffer`
     *
     * This function should be "pure", i.e.,
     * same `value` should always be converted to `ArrayBuffer`s that have same content.
     */
    public abstract toBuffer(value: TValue): Uint8Array;

    /** When implemented in derived classes, converts the `ArrayBuffer` to a type-specific value */
    public abstract fromBuffer(array: Uint8Array): TValue;

    /**
     * When implemented in derived classes, gets the size in byte of the type-specific `value`.
     *
     * If the size can't be calculated without first converting the `value` back to an `ArrayBuffer`,
     * implementer should returns `-1` so the caller will get its size by first converting it to
     * an `ArrayBuffer` (and cache the result).
     */
    public abstract getSize(value: TValue): number;
}

/** An ArrayBufferLike type that's actually an `ArrayBuffer` */
export class Uint8ArrayBufferFieldSubType extends BufferFieldSubType<Uint8Array> {
    public static readonly Instance = new Uint8ArrayBufferFieldSubType();

    protected constructor() {
        super();
    }

    public toBuffer(value: Uint8Array): Uint8Array {
        return value;
    }

    public fromBuffer(buffer: Uint8Array): Uint8Array {
        return buffer;
    }

    public getSize(value: Uint8Array): number {
        return value.byteLength;
    }
}

/** An ArrayBufferLike type that converts between `ArrayBuffer` and `string` */
export class StringBufferFieldSubType<TTypeScriptType = string>
    extends BufferFieldSubType<string, TTypeScriptType> {
    public static readonly Instance = new StringBufferFieldSubType();

    public toBuffer(value: string): Uint8Array {
        return encodeUtf8(value);
    }

    public fromBuffer(array: Uint8Array): string {
        return decodeUtf8(array);
    }

    public getSize(): number {
        // Return `-1`, so `ArrayBufferLikeFieldDefinition` will
        // convert this `value` into an `ArrayBuffer` (and cache the result),
        // Then get the size from that `ArrayBuffer`
        return -1;
    }
}

const EmptyArrayBuffer = new ArrayBuffer(0);

export abstract class ArrayBufferLikeFieldDefinition<
    TType extends BufferFieldSubType<any, any> = BufferFieldSubType<unknown, unknown>,
    TOptions = void,
    TOmitInitKey extends PropertyKey = never,
    > extends StructFieldDefinition<
    TOptions,
    TType['TTypeScriptType'],
    TOmitInitKey
    >{
    public readonly type: TType;

    public constructor(type: TType, options: TOptions) {
        super(options);
        this.type = type;
    }

    protected getDeserializeSize(struct: StructValue): number {
        return this.getSize();
    }

    /**
     * When implemented in derived classes, creates a `StructFieldValue` for the current field definition.
     */
    public create(
        options: Readonly<StructOptions>,
        struct: StructValue,
        value: TType['TTypeScriptType'],
        arrayBuffer?: ArrayBuffer,
    ): ArrayBufferLikeFieldValue<this> {
        return new ArrayBufferLikeFieldValue(this, options, struct, value, arrayBuffer);
    }

    public override deserialize(
        options: Readonly<StructOptions>,
        stream: StructDeserializeStream,
        struct: StructValue,
    ): ArrayBufferLikeFieldValue<this>;
    public override deserialize(
        options: Readonly<StructOptions>,
        stream: StructAsyncDeserializeStream,
        struct: StructValue,
    ): Promise<ArrayBufferLikeFieldValue<this>>;
    public override deserialize(
        options: Readonly<StructOptions>,
        stream: StructDeserializeStream | StructAsyncDeserializeStream,
        struct: StructValue,
    ): ValueOrPromise<ArrayBufferLikeFieldValue<this>> {
        return Syncbird.try(() => {
            const size = this.getDeserializeSize(struct);
            if (size === 0) {
                return EmptyArrayBuffer;
            } else {
                return stream.read(size);
            }
        }).then(arrayBuffer => {
            const value = this.type.fromBuffer(arrayBuffer);
            return this.create(options, struct, value, arrayBuffer);
        }).valueOrPromise();
    }
}

export class ArrayBufferLikeFieldValue<
    TDefinition extends ArrayBufferLikeFieldDefinition<BufferFieldSubType<unknown, unknown>, any, any>,
    > extends StructFieldValue<TDefinition> {
    protected arrayBuffer: ArrayBuffer | undefined;

    public constructor(
        definition: TDefinition,
        options: Readonly<StructOptions>,
        struct: StructValue,
        value: TDefinition['TValue'],
        arrayBuffer?: ArrayBuffer,
    ) {
        super(definition, options, struct, value);
        this.arrayBuffer = arrayBuffer;
    }

    public override set(value: TDefinition['TValue']): void {
        super.set(value);
        this.arrayBuffer = undefined;
    }

    public serialize(dataView: DataView, offset: number): void {
        if (!this.arrayBuffer) {
            this.arrayBuffer = this.definition.type.toBuffer(this.value);
        }

        new Uint8Array(dataView.buffer)
            .set(new Uint8Array(this.arrayBuffer), offset);
    }
}
