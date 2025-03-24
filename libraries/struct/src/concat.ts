import type { Field } from "./field.js";
import type { Struct } from "./struct.js";
import { struct } from "./struct.js";
import type { StructDeserializer } from "./types.js";

type UnionToIntersection<U> = (
    U extends unknown ? (x: U) => void : never
) extends (x: infer I) => void
    ? I
    : never;

type As<T, U> = T extends infer V extends U ? V : never;

export function concat<
    T extends Struct<
        Record<
            string,
            | Field<unknown, string, unknown, unknown>
            | StructDeserializer<unknown>
        >,
        Record<PropertyKey, unknown> | undefined,
        unknown
    >[],
>(
    ...structs: T
): Struct<
    As<
        UnionToIntersection<T[number]["fields"]>,
        Record<
            string,
            | Field<unknown, string, unknown, unknown>
            | StructDeserializer<unknown>
        >
    >,
    As<UnionToIntersection<T[number]["extra"]>, Record<PropertyKey, unknown>>
> {
    return struct(
        structs.reduce(
            (fields, struct) => Object.assign(fields, struct.fields),
            {},
        ),
        {
            littleEndian: true,
            extra: structs.reduce(
                (extras, struct) =>
                    Object.defineProperties(
                        extras,
                        Object.getOwnPropertyDescriptors(struct.extra),
                    ),
                {},
            ),
        },
    ) as never;
}
