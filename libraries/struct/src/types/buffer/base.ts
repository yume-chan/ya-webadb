import type {
    StructAsyncDeserializeStream,
    StructDeserializeStream,
    StructOptions,
    StructValue,
} from "../../basic/index.js";
import { StructFieldDefinition, StructFieldValue } from "../../basic/index.js";
import { SyncPromise } from "../../sync-promise.js";
import type { ValueOrPromise } from "../../utils.js";
import { decodeUtf8, encodeUtf8 } from "../../utils.js";

/**
 * Base class for all types that
 * can be converted from an `Uint8Array` when deserialized,
 * and need to be converted to an `Uint8Array` when serializing
 *
 * @template TValue The actual TypeScript type of this type
 * @template TTypeScriptType Optional another type (should be compatible with `TType`)
 * specified by user when creating field definitions.
 */
export abstract class BufferFieldSubType<
    TValue = unknown,
    TTypeScriptType = TValue
> {
    public readonly TTypeScriptType!: TTypeScriptType;

    /**
     * When implemented in derived classes, converts the type-specific `value` to an `Uint8Array`
     *
     * This function should be "pure", i.e.,
     * same `value` should always be converted to `Uint8Array`s that have same content.
     */
    public abstract toBuffer(value: TValue): Uint8Array;

    /** When implemented in derived classes, converts the `Uint8Array` to a type-specific value */
    public abstract toValue(array: Uint8Array): TValue;

    /**
     * When implemented in derived classes, gets the size in byte of the type-specific `value`.
     *
     * If the size can't be calculated without first converting the `value` back to an `Uint8Array`,
     * implementer can returns `-1`, so the caller will get its size by first converting it to
     * an `Uint8Array` (and cache the result).
     */
    public abstract getSize(value: TValue): number;
}

/** An `BufferFieldSubType` that's actually an `Uint8Array` */
export class Uint8ArrayBufferFieldSubType<
    TTypeScriptType = Uint8Array
> extends BufferFieldSubType<Uint8Array, TTypeScriptType> {
    public static readonly Instance = new Uint8ArrayBufferFieldSubType();

    protected constructor() {
        super();
    }

    public toBuffer(value: Uint8Array): Uint8Array {
        return value;
    }

    public toValue(buffer: Uint8Array): Uint8Array {
        return buffer;
    }

    public getSize(value: Uint8Array): number {
        return value.byteLength;
    }
}

/** An `BufferFieldSubType` that converts between `Uint8Array` and `string` */
export class StringBufferFieldSubType<
    TTypeScriptType = string
> extends BufferFieldSubType<string, TTypeScriptType> {
    public static readonly Instance = new StringBufferFieldSubType();

    public toBuffer(value: string): Uint8Array {
        return encodeUtf8(value);
    }

    public toValue(array: Uint8Array): string {
        return decodeUtf8(array);
    }

    public getSize(): number {
        // Return `-1`, so `BufferLikeFieldDefinition` will
        // convert this `value` into an `Uint8Array` (and cache the result),
        // Then get the size from that `Uint8Array`
        return -1;
    }
}

export const EMPTY_UINT8_ARRAY = new Uint8Array(0);

export abstract class BufferLikeFieldDefinition<
    TType extends BufferFieldSubType<any, any> = BufferFieldSubType<
        unknown,
        unknown
    >,
    TOptions = void,
    TOmitInitKey extends PropertyKey = never,
    TTypeScriptType = TType["TTypeScriptType"]
> extends StructFieldDefinition<TOptions, TTypeScriptType, TOmitInitKey> {
    public readonly type: TType;

    public constructor(type: TType, options: TOptions) {
        super(options);
        this.type = type;
    }

    protected getDeserializeSize(struct: StructValue): number {
        void struct;
        return this.getSize();
    }

    /**
     * When implemented in derived classes, creates a `StructFieldValue` for the current field definition.
     */
    public create(
        options: Readonly<StructOptions>,
        struct: StructValue,
        value: TType["TTypeScriptType"],
        array?: Uint8Array
    ): BufferLikeFieldValue<this> {
        return new BufferLikeFieldValue(this, options, struct, value, array);
    }

    public override deserialize(
        options: Readonly<StructOptions>,
        stream: StructDeserializeStream,
        struct: StructValue
    ): BufferLikeFieldValue<this>;
    public override deserialize(
        options: Readonly<StructOptions>,
        stream: StructAsyncDeserializeStream,
        struct: StructValue
    ): Promise<BufferLikeFieldValue<this>>;
    public override deserialize(
        options: Readonly<StructOptions>,
        stream: StructDeserializeStream | StructAsyncDeserializeStream,
        struct: StructValue
    ): ValueOrPromise<BufferLikeFieldValue<this>> {
        return SyncPromise.try(() => {
            const size = this.getDeserializeSize(struct);
            if (size === 0) {
                return EMPTY_UINT8_ARRAY;
            } else {
                return stream.read(size);
            }
        })
            .then((array) => {
                const value = this.type.toValue(array);
                return this.create(options, struct, value, array);
            })
            .valueOrPromise();
    }
}

export class BufferLikeFieldValue<
    TDefinition extends BufferLikeFieldDefinition<
        BufferFieldSubType<unknown, unknown>,
        any,
        any
    >
> extends StructFieldValue<TDefinition> {
    protected array: Uint8Array | undefined;

    public constructor(
        definition: TDefinition,
        options: Readonly<StructOptions>,
        struct: StructValue,
        value: TDefinition["TValue"],
        array?: Uint8Array
    ) {
        super(definition, options, struct, value);
        this.array = array;
    }

    public override set(value: TDefinition["TValue"]): void {
        super.set(value);
        // When value changes, clear the cached `array`
        // It will be lazily calculated in `serialize()`
        this.array = undefined;
    }

    public serialize(dataView: DataView, offset: number): void {
        if (!this.array) {
            this.array = this.definition.type.toBuffer(this.value);
        }

        new Uint8Array(
            dataView.buffer,
            dataView.byteOffset,
            dataView.byteLength
        ).set(this.array, offset);
    }
}
