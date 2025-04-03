import type { BipedalGenerator } from "../bipedal.js";
import { bipedal } from "../bipedal.js";
import type { AsyncExactReadable } from "../readable.js";

import type {
    ByobFieldSerializer,
    DefaultFieldSerializer,
} from "./serialize.js";
import { byobFieldSerializer, defaultFieldSerializer } from "./serialize.js";
import type { Field, FieldDeserializeContext, FieldOptions } from "./types.js";

export type BipedalFieldDeserializer<T, D> = BipedalGenerator<
    undefined,
    T,
    [reader: AsyncExactReadable, context: FieldDeserializeContext<D>]
>;

// eslint-disable-next-line @typescript-eslint/max-params
function _field<T, OmitInit extends string, D, Raw = T>(
    size: number,
    type: "default",
    serialize: DefaultFieldSerializer<Raw>,
    deserialize: BipedalFieldDeserializer<T, D>,
    options?: FieldOptions<T, OmitInit, D, Raw>,
): Field<T, OmitInit, D, Raw>;
// eslint-disable-next-line @typescript-eslint/max-params
function _field<T, OmitInit extends string, D, Raw = T>(
    size: number,
    type: "byob",
    serialize: ByobFieldSerializer<Raw>,
    deserialize: BipedalFieldDeserializer<T, D>,
    options?: FieldOptions<T, OmitInit, D, Raw>,
): Field<T, OmitInit, D, Raw>;
/* #__NO_SIDE_EFFECTS__ */
// eslint-disable-next-line @typescript-eslint/max-params
function _field<T, OmitInit extends string, D, Raw = T>(
    size: number,
    type: "default" | "byob",
    serialize: DefaultFieldSerializer<Raw> | ByobFieldSerializer<Raw>,
    deserialize: BipedalFieldDeserializer<T, D>,
    options?: FieldOptions<T, OmitInit, D, Raw>,
): Field<T, OmitInit, D, Raw> {
    const field: Field<T, OmitInit, D, Raw> = {
        size,
        type: type,
        serialize:
            type === "default"
                ? defaultFieldSerializer(
                      serialize as DefaultFieldSerializer<Raw>,
                  )
                : byobFieldSerializer(
                      size,
                      serialize as ByobFieldSerializer<Raw>,
                  ),
        deserialize: bipedal(deserialize) as never,
        omitInit: options?.omitInit,
    };
    if (options?.init) {
        field.init = options.init;
    }
    return field;
}

export const field = _field;
