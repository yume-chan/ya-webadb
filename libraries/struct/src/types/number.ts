import type {
    AsyncExactReadable,
    ExactReadable,
    StructOptions,
    StructValue,
} from "../basic/index.js";
import { StructFieldDefinition, StructFieldValue } from "../basic/index.js";
import { SyncPromise } from "../sync-promise.js";
import type { ValueOrPromise } from "../utils.js";
import type { NumberFieldVariant } from "./number-reexports.js";

export * from "./number-reexports.js";

export class NumberFieldDefinition<
    TVariant extends NumberFieldVariant = NumberFieldVariant,
    TTypeScriptType = number,
> extends StructFieldDefinition<void, TTypeScriptType> {
    readonly variant: TVariant;

    constructor(variant: TVariant, typescriptType?: TTypeScriptType) {
        void typescriptType;
        super();
        this.variant = variant;
    }

    getSize(): number {
        return this.variant.size;
    }

    create(
        options: Readonly<StructOptions>,
        struct: StructValue,
        value: TTypeScriptType,
    ): NumberFieldValue<this> {
        return new NumberFieldValue(this, options, struct, value);
    }

    override deserialize(
        options: Readonly<StructOptions>,
        stream: ExactReadable,
        struct: StructValue,
    ): NumberFieldValue<this>;
    override deserialize(
        options: Readonly<StructOptions>,
        stream: AsyncExactReadable,
        struct: StructValue,
    ): Promise<NumberFieldValue<this>>;
    override deserialize(
        options: Readonly<StructOptions>,
        stream: ExactReadable | AsyncExactReadable,
        struct: StructValue,
    ): ValueOrPromise<NumberFieldValue<this>> {
        return SyncPromise.try(() => {
            return stream.readExactly(this.getSize());
        })
            .then((array) => {
                const value = this.variant.deserialize(
                    array,
                    options.littleEndian,
                );
                return this.create(options, struct, value as never);
            })
            .valueOrPromise();
    }
}

export class NumberFieldValue<
    TDefinition extends NumberFieldDefinition<NumberFieldVariant, unknown>,
> extends StructFieldValue<TDefinition> {
    serialize(array: Uint8Array, offset: number): void {
        this.definition.variant.serialize(
            array,
            offset,
            this.value as never,
            this.options.littleEndian,
        );
    }
}
