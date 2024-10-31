import { bipedal } from "./bipedal.js";
import type { DeserializeContext, Field, SerializeContext } from "./field.js";
import type { AsyncExactReadable, ExactReadable } from "./readable.js";
import { ExactReadableEndedError } from "./readable.js";
import type { MaybePromiseLike } from "./utils.js";

export type FieldsType<
    T extends Record<string, Field<unknown, string, unknown>>,
> = {
    [K in keyof T]: T[K] extends Field<infer TK, string, unknown> ? TK : never;
};

export type StructInit<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends Struct<any, any, any>,
> = Omit<
    FieldsType<T["fields"]>,
    {
        [K in keyof T["fields"]]: T["fields"][K] extends Field<
            unknown,
            infer U,
            unknown
        >
            ? U
            : never;
    }[keyof T["fields"]]
>;

export type StructValue<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends Struct<any, any, any>,
> = ReturnType<Exclude<T["postDeserialize"], undefined>>;

export class StructDeserializeError extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class StructNotEnoughDataError extends StructDeserializeError {
    constructor() {
        super(
            "The underlying readable was ended before the struct was fully deserialized",
        );
    }
}

export class StructEmptyError extends StructDeserializeError {
    constructor() {
        super("The underlying readable doesn't contain any more struct");
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StructLike<T> = Struct<any, any, T>;

export class Struct<
    T extends Record<string, Field<unknown, string, Partial<FieldsType<T>>>>,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    Extra extends Record<PropertyKey, unknown> = {},
    PostDeserialize = FieldsType<T> & Extra,
> {
    fields: T;
    size: number;

    #fieldList: [string, Field<unknown, string, unknown>][] = [];

    littleEndian: boolean;

    extra: Extra;

    postDeserialize?:
        | ((fields: FieldsType<T> & Extra) => PostDeserialize)
        | undefined;

    constructor(
        fields: T,
        options: {
            littleEndian?: boolean;
            extra?: Extra & ThisType<FieldsType<T>>;
            postDeserialize?: (
                this: FieldsType<T> & Extra,
                fields: FieldsType<T> & Extra,
            ) => PostDeserialize;
        },
    ) {
        this.#fieldList = Object.entries(fields);
        this.fields = fields;
        this.size = this.#fieldList.reduce(
            (sum, [, field]) => sum + field.size,
            0,
        );

        this.littleEndian = !!options.littleEndian;
        this.extra = options.extra!;
        this.postDeserialize = options.postDeserialize;
    }

    serialize(runtimeStruct: StructInit<this>): Uint8Array;
    serialize(runtimeStruct: StructInit<this>, buffer: Uint8Array): number;
    serialize(
        runtimeStruct: StructInit<this>,
        buffer?: Uint8Array,
    ): Uint8Array | number {
        for (const [key, field] of this.#fieldList) {
            if (key in runtimeStruct) {
                field.preSerialize?.(
                    runtimeStruct[key as never],
                    runtimeStruct,
                );
            }
        }

        const sizes = this.#fieldList.map(
            ([key, field]) =>
                field.dynamicSize?.(runtimeStruct[key as never]) ?? field.size,
        );
        const size = sizes.reduce((sum, size) => sum + size, 0);

        let externalBuffer = false;
        if (buffer) {
            if (buffer.length < size) {
                throw new Error("Buffer too small");
            }

            externalBuffer = true;
        } else {
            buffer = new Uint8Array(size);
        }

        const context: SerializeContext = {
            buffer,
            index: 0,
            littleEndian: this.littleEndian,
        };
        for (const [index, [key, field]] of this.#fieldList.entries()) {
            field.serialize(runtimeStruct[key as never], context);
            context.index += sizes[index]!;
        }

        if (externalBuffer) {
            return size;
        } else {
            return buffer;
        }
    }

    deserialize: {
        (reader: ExactReadable): PostDeserialize;
        (reader: AsyncExactReadable): MaybePromiseLike<PostDeserialize>;
    } = bipedal(function* (
        this: Struct<T, Extra, PostDeserialize>,
        then,
        reader: AsyncExactReadable,
    ) {
        const startPosition = reader.position;

        const runtimeStruct = {} as Record<string, unknown>;
        const context: DeserializeContext<unknown> = {
            reader,
            runtimeStruct,
            littleEndian: this.littleEndian,
        };

        try {
            for (const [key, field] of this.#fieldList) {
                runtimeStruct[key] = yield* then(field.deserialize(context));
            }
        } catch (e) {
            if (!(e instanceof ExactReadableEndedError)) {
                throw e;
            }

            if (reader.position === startPosition) {
                throw new StructEmptyError();
            } else {
                throw new StructNotEnoughDataError();
            }
        }

        if (this.extra) {
            Object.defineProperties(
                runtimeStruct,
                Object.getOwnPropertyDescriptors(this.extra),
            );
        }

        if (this.postDeserialize) {
            return this.postDeserialize.call(
                runtimeStruct,
                runtimeStruct as never,
            );
        } else {
            return runtimeStruct as never;
        }
    }) as never;
}
