/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
    AsyncExactReadable,
    ExactReadable,
    StructOptions,
    StructValue,
} from "../../basic/index.js";
import { StructFieldDefinition, StructFieldValue } from "../../basic/index.js";
import { SyncPromise } from "../../sync-promise.js";
import type { ValueOrPromise } from "../../utils.js";
import { decodeUtf8, encodeUtf8 } from "../../utils.js";

/**
 * A converter for buffer-like fields.
 * It converts `Uint8Array`s to custom-typed values when deserializing,
 * and convert values back to `Uint8Array`s when serializing.
 *
 * @template TValue The type of the value that the converter converts to/from `Uint8Array`.
 * @template TTypeScriptType Optionally another type to refine `TValue`.
 * For example, `TValue` is `string`, and `TTypeScriptType` is `"foo" | "bar"`.
 * `TValue` is specified by the developer when creating an converter implementation,
 * `TTypeScriptType` is specified by the user when creating a field.
 */
export abstract class BufferFieldConverter<
    TValue = unknown,
    TTypeScriptType = TValue,
> {
    readonly TTypeScriptType!: TTypeScriptType;

    /**
     * When implemented in derived classes, converts the custom `value` to an `Uint8Array`
     *
     * This function should be "pure", i.e.,
     * same `value` should always be converted to `Uint8Array`s that have same content.
     */
    abstract toBuffer(value: TValue): Uint8Array;

    /** When implemented in derived classes, converts the `Uint8Array` to a custom value */
    abstract toValue(array: Uint8Array): TValue;

    /**
     * When implemented in derived classes, gets the size in byte of the custom `value`.
     *
     * If the size can't be determined without first converting the `value` back to an `Uint8Array`,
     * the implementer should return `undefined`. In which case, the caller will call `toBuffer` to
     * convert the value to a `Uint8Array`, then read the length of the `Uint8Array`. The caller can
     * cache the result so the serialization process doesn't need to call `toBuffer` again.
     */
    abstract getSize(value: TValue): number | undefined;
}

/** An identity converter, doesn't convert to anything else. */
export class Uint8ArrayBufferFieldConverter<
    TTypeScriptType = Uint8Array,
> extends BufferFieldConverter<Uint8Array, TTypeScriptType> {
    static readonly Instance =
        /* #__PURE__ */ new Uint8ArrayBufferFieldConverter();

    protected constructor() {
        super();
    }

    override toBuffer(value: Uint8Array): Uint8Array {
        return value;
    }

    override toValue(buffer: Uint8Array): Uint8Array {
        return buffer;
    }

    override getSize(value: Uint8Array): number {
        return value.length;
    }
}

/** An `BufferFieldSubType` that converts between `Uint8Array` and `string` */
export class StringBufferFieldConverter<
    TTypeScriptType = string,
> extends BufferFieldConverter<string, TTypeScriptType> {
    static readonly Instance = /* #__PURE__ */ new StringBufferFieldConverter();

    override toBuffer(value: string): Uint8Array {
        return encodeUtf8(value);
    }

    override toValue(array: Uint8Array): string {
        return decodeUtf8(array);
    }

    override getSize(): number | undefined {
        // See the note in `BufferFieldConverter.getSize`
        return undefined;
    }
}

export const EMPTY_UINT8_ARRAY = new Uint8Array(0);

export abstract class BufferLikeFieldDefinition<
    TConverter extends BufferFieldConverter<
        unknown,
        unknown
    > = BufferFieldConverter<unknown, unknown>,
    TOptions = void,
    TOmitInitKey extends PropertyKey = never,
    TTypeScriptType = TConverter["TTypeScriptType"],
> extends StructFieldDefinition<TOptions, TTypeScriptType, TOmitInitKey> {
    readonly converter: TConverter;
    readonly TTypeScriptType!: TTypeScriptType;

    constructor(converter: TConverter, options: TOptions) {
        super(options);
        this.converter = converter;
    }

    protected getDeserializeSize(struct: StructValue): number {
        void struct;
        return this.getSize();
    }

    /**
     * When implemented in derived classes, creates a `StructFieldValue` for the current field definition.
     */
    create(
        options: Readonly<StructOptions>,
        struct: StructValue,
        value: TTypeScriptType,
        array?: Uint8Array,
    ): BufferLikeFieldValue<this> {
        return new BufferLikeFieldValue(this, options, struct, value, array);
    }

    override deserialize(
        options: Readonly<StructOptions>,
        stream: ExactReadable,
        struct: StructValue,
    ): BufferLikeFieldValue<this>;
    override deserialize(
        options: Readonly<StructOptions>,
        stream: AsyncExactReadable,
        struct: StructValue,
    ): Promise<BufferLikeFieldValue<this>>;
    override deserialize(
        options: Readonly<StructOptions>,
        stream: ExactReadable | AsyncExactReadable,
        struct: StructValue,
    ): ValueOrPromise<BufferLikeFieldValue<this>> {
        return SyncPromise.try(() => {
            const size = this.getDeserializeSize(struct);
            if (size === 0) {
                return EMPTY_UINT8_ARRAY;
            } else {
                return stream.readExactly(size);
            }
        })
            .then((array) => {
                const value = this.converter.toValue(array) as TTypeScriptType;
                return this.create(options, struct, value, array);
            })
            .valueOrPromise();
    }
}

export class BufferLikeFieldValue<
    TDefinition extends BufferLikeFieldDefinition<
        BufferFieldConverter<unknown, unknown>,
        any,
        any,
        any
    >,
> extends StructFieldValue<TDefinition> {
    protected array: Uint8Array | undefined;

    // eslint-disable-next-line @typescript-eslint/max-params
    constructor(
        definition: TDefinition,
        options: Readonly<StructOptions>,
        struct: StructValue,
        value: TDefinition["TTypeScriptType"],
        array?: Uint8Array,
    ) {
        super(definition, options, struct, value);
        this.array = array;
    }

    override set(value: TDefinition["TValue"]): void {
        super.set(value);
        // When value changes, clear the cached `array`
        // It will be lazily calculated in `serialize()`
        this.array = undefined;
    }

    override serialize(array: Uint8Array, offset: number): void {
        this.array ??= this.definition.converter.toBuffer(this.value);
        array.set(this.array, offset);
    }
}
