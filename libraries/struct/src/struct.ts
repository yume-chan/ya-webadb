import { bipedal } from "./bipedal.js";
import type {
    Field,
    FieldByobSerializeContext,
    FieldDefaultSerializeContext,
    FieldDeserializeContext,
    FieldDeserializer,
} from "./field/index.js";
import type { AsyncExactReadable } from "./readable.js";
import { ExactReadableEndedError } from "./readable.js";
import type {
    StructDeserializer,
    StructLike,
    StructSerializeContext,
    StructSerializer,
} from "./types.js";

export type StructField =
    | Field<unknown, string, unknown, unknown>
    | (StructSerializer<unknown> & StructDeserializer<unknown>);

export type StructFields = Record<string, StructField>;

export type FieldsValue<T extends StructFields> = {
    [K in keyof T]: T[K] extends FieldDeserializer<infer U, unknown>
        ? U
        : never;
};

export type FieldOmitInit<T extends StructField> =
    T extends Field<unknown, infer U, unknown, unknown>
        ? string extends U
            ? never
            : U
        : never;

export type FieldsOmitInits<T extends StructFields> = {
    [K in keyof T]: FieldOmitInit<T[K]>;
}[keyof T];

export type FieldsInit<T extends StructFields> = Omit<
    FieldsValue<T>,
    FieldsOmitInits<T>
>;

export class StructDeserializeError extends Error {
    constructor(message: string) {
        super(message);
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

export type ExtraToIntersection<
    Extra extends Record<PropertyKey, unknown> | undefined,
> = Extra extends undefined ? unknown : Extra;

export interface Struct<
    Fields extends StructFields,
    Extra extends Record<PropertyKey, unknown> | undefined = undefined,
    PostDeserialize = FieldsValue<Fields> & Extra,
> extends StructSerializer<FieldsInit<Fields>>,
        StructDeserializer<PostDeserialize> {
    littleEndian: boolean;
    fields: Fields;
    extra: Extra;
}

/* #__NO_SIDE_EFFECTS__ */
export function struct<
    Fields extends Record<
        string,
        | Field<unknown, string, Partial<FieldsValue<Fields>>, unknown>
        | StructLike<unknown>
    >,
    Extra extends Record<PropertyKey, unknown> | undefined = undefined,
    PostDeserialize = FieldsValue<Fields> & ExtraToIntersection<Extra>,
>(
    fields: Fields,
    options: {
        littleEndian: boolean;
        extra?: (Extra & ThisType<FieldsValue<Fields>>) | undefined;
        postDeserialize?:
            | ((
                  this: FieldsValue<Fields> & ExtraToIntersection<Extra>,
                  value: FieldsValue<Fields> & ExtraToIntersection<Extra>,
              ) => PostDeserialize)
            | undefined;
    },
): Struct<Fields, Extra, PostDeserialize> {
    const fieldList = Object.entries(fields);

    let size = 0;
    let byob = true;
    for (const [, field] of fieldList) {
        size += field.size;
        if (byob && field.type !== "byob") {
            byob = false;
        }
    }

    const littleEndian = options.littleEndian;
    const extra = options.extra
        ? Object.getOwnPropertyDescriptors(options.extra)
        : undefined;

    return {
        littleEndian,
        fields,
        extra: options.extra,

        type: byob ? "byob" : "default",
        size,
        serialize(
            source: FieldsInit<Fields>,
            bufferOrContext?: Uint8Array | StructSerializeContext,
        ): Uint8Array | number {
            const temp: Record<string, unknown> = { ...source };

            for (const [key, field] of fieldList) {
                if (key in temp && "init" in field) {
                    const result = field.init?.(temp[key], temp as never);
                    temp[key] = result;
                }
            }

            const sizes = new Array<number>(fieldList.length);
            const buffers = new Array<Uint8Array | undefined>(fieldList.length);
            {
                const context: FieldDefaultSerializeContext = { littleEndian };
                for (const [index, [key, field]] of fieldList.entries()) {
                    if (field.type === "byob") {
                        sizes[index] = field.size;
                    } else {
                        buffers[index] = field.serialize(temp[key], context);
                        sizes[index] = buffers[index].length;
                    }
                }
            }

            const size = sizes.reduce((sum, size) => sum + size, 0);

            let externalBuffer: boolean;
            let buffer: Uint8Array;
            let index: number;
            if (bufferOrContext instanceof Uint8Array) {
                if (bufferOrContext.length < size) {
                    throw new Error("Buffer too small");
                }
                externalBuffer = true;
                buffer = bufferOrContext;
                index = 0;
            } else if (
                typeof bufferOrContext === "object" &&
                "buffer" in bufferOrContext
            ) {
                externalBuffer = true;
                buffer = bufferOrContext.buffer;
                index = bufferOrContext.index ?? 0;
                if (buffer.length - index < size) {
                    throw new Error("Buffer too small");
                }
            } else {
                externalBuffer = false;
                buffer = new Uint8Array(size);
                index = 0;
            }

            const context = {
                buffer,
                index,
                littleEndian,
            } satisfies FieldByobSerializeContext;
            for (const [index, [key, field]] of fieldList.entries()) {
                if (buffers[index]) {
                    buffer.set(buffers[index], context.index);
                } else {
                    field.serialize(temp[key], context);
                }
                context.index += sizes[index]!;
            }

            if (externalBuffer) {
                return size;
            } else {
                return buffer;
            }
        },
        deserialize: bipedal(function* (
            this: Struct<Fields, Extra, PostDeserialize>,
            then,
            reader: AsyncExactReadable,
        ) {
            const startPosition = reader.position;

            const result = {} as Record<string, unknown>;
            const context: FieldDeserializeContext<
                Partial<FieldsValue<Fields>>
            > = {
                dependencies: result as never,
                littleEndian: littleEndian,
            };

            try {
                for (const [key, field] of fieldList) {
                    result[key] = yield* then(
                        field.deserialize(reader, context),
                    );
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

            if (extra) {
                Object.defineProperties(result, extra);
            }

            if (options.postDeserialize) {
                return options.postDeserialize.call(
                    result as never,
                    result as never,
                );
            } else {
                return result;
            }
        }),
    } as never;
}
