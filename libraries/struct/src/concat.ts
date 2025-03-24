import type { FieldsValue, Struct, StructFields } from "./struct.js";
import { struct } from "./struct.js";

type UnionToIntersection<U> = (
    U extends unknown ? (x: U) => void : never
) extends (x: infer I) => void
    ? I
    : never;

type As<T, U> = T extends infer V extends U ? V : never;

export type ConcatFields<
    T extends Struct<
        StructFields,
        Record<PropertyKey, unknown> | undefined,
        unknown
    >[],
> = As<UnionToIntersection<T[number]["fields"]>, StructFields>;

type ConcatFieldValues<
    T extends Struct<
        StructFields,
        Record<PropertyKey, unknown> | undefined,
        unknown
    >[],
> = FieldsValue<ConcatFields<T>>;

type ExtraToUnion<Extra extends Record<PropertyKey, unknown> | undefined> =
    Extra extends undefined ? never : Extra;

export type ConcatExtras<
    T extends Struct<
        StructFields,
        Record<PropertyKey, unknown> | undefined,
        unknown
    >[],
> = As<
    UnionToIntersection<ExtraToUnion<T[number]["extra"]>>,
    Record<PropertyKey, unknown>
>;

/* #__NO_SIDE_EFFECTS__ */
export function concat<
    T extends Struct<
        StructFields,
        Record<PropertyKey, unknown> | undefined,
        unknown
    >[],
    PostDeserialize = ConcatFieldValues<T> & ConcatExtras<T>,
>(
    options: {
        littleEndian: boolean;
        postDeserialize?: (
            this: ConcatFieldValues<T> & ConcatExtras<T>,
            value: ConcatFieldValues<T> & ConcatExtras<T>,
        ) => PostDeserialize;
    },
    ...structs: T
): Struct<ConcatFields<T>, ConcatExtras<T>, PostDeserialize> {
    return struct(
        structs.reduce(
            (fields, struct) => Object.assign(fields, struct.fields),
            {},
        ) as never,
        {
            littleEndian: options.littleEndian,
            postDeserialize: options.postDeserialize,
            extra: structs.reduce(
                (extras, struct) =>
                    Object.defineProperties(
                        extras,
                        Object.getOwnPropertyDescriptors(struct.extra),
                    ),
                {},
            ) as never,
        },
    ) as never;
}
