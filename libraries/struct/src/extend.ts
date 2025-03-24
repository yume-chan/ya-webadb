import type {
    ExtraToIntersection,
    FieldsValue,
    Struct,
    StructFields,
} from "./struct.js";
import { struct } from "./struct.js";

/* #__NO_SIDE_EFFECTS__ */
export function extend<
    Base extends Struct<
        StructFields,
        Record<PropertyKey, unknown> | undefined,
        unknown
    >,
    Fields extends StructFields,
    PostDeserialize = FieldsValue<Base["fields"] & Fields> &
        ExtraToIntersection<Base["extra"]>,
>(
    base: Base,
    fields: Fields,
    options?: {
        littleEndian?: boolean | undefined;
        postDeserialize?: (
            this: FieldsValue<Base["fields"] & Fields> &
                ExtraToIntersection<Base["extra"]>,
            value: FieldsValue<Base["fields"] & Fields> &
                ExtraToIntersection<Base["extra"]>,
        ) => PostDeserialize;
    },
): Struct<Base["fields"] & Fields, Base["extra"], PostDeserialize> {
    return struct(Object.assign({}, base.fields, fields), {
        littleEndian: options?.littleEndian ?? base.littleEndian,
        extra: base.extra as never,
        postDeserialize: options?.postDeserialize,
    }) as never;
}
