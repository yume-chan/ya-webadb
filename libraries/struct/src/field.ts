import type { MaybePromiseLike } from "@yume-chan/async";

import { bipedal } from "./bipedal.js";
import type { AsyncExactReadable } from "./readable.js";
import type {
    FieldByobSerializeContext,
    FieldDefaultSerializeContext,
    FieldDeserializeContext,
    FieldDeserializer,
    FieldSerializer,
} from "./types.js";

export interface Field<T, OmitInit extends string, D, Raw = T>
    extends FieldSerializer<Raw>,
        FieldDeserializer<T, D> {
    omitInit: OmitInit | undefined;

    init?(value: T, dependencies: D): Raw | undefined;
}

// eslint-disable-next-line @typescript-eslint/max-params
function _field<T, OmitInit extends string, D, Raw = T>(
    size: number,
    type: "default",
    serialize: (
        source: Raw,
        context: FieldDefaultSerializeContext,
    ) => Uint8Array,
    deserialize: (
        then: <U>(value: MaybePromiseLike<U>) => Iterable<unknown, U, unknown>,
        reader: AsyncExactReadable,
        context: FieldDeserializeContext<D>,
    ) => Generator<unknown, T, unknown>,
    options?: {
        omitInit?: OmitInit;
        dependencies?: D;
        init?: (value: T, dependencies: D) => Raw | undefined;
    },
): Field<T, OmitInit, D, Raw>;
/* @__NO_SIDE_EFFECTS__ */
// eslint-disable-next-line @typescript-eslint/max-params
function _field<T, OmitInit extends string, D, Raw = T>(
    size: number,
    type: "byob",
    serialize: (
        source: Raw,
        context: FieldByobSerializeContext & { index: number },
    ) => void,
    deserialize: (
        then: <U>(value: MaybePromiseLike<U>) => Iterable<unknown, U, unknown>,
        reader: AsyncExactReadable,
        context: FieldDeserializeContext<D>,
    ) => Generator<unknown, T, unknown>,
    options?: {
        omitInit?: OmitInit;
        dependencies?: D;
        init?: (value: T, dependencies: D) => Raw | undefined;
    },
): Field<T, OmitInit, D, Raw>;
/* #__NO_SIDE_EFFECTS__ */
// eslint-disable-next-line @typescript-eslint/max-params
function _field<T, OmitInit extends string, D, Raw = T>(
    size: number,
    type: "default" | "byob",
    serialize:
        | ((source: Raw, context: FieldDefaultSerializeContext) => Uint8Array)
        | ((
              source: Raw,
              context: FieldByobSerializeContext & { index: number },
          ) => void),
    deserialize: (
        then: <U>(value: MaybePromiseLike<U>) => Iterable<unknown, U, unknown>,
        reader: AsyncExactReadable,
        context: FieldDeserializeContext<D>,
    ) => Generator<unknown, T, unknown>,
    options?: {
        omitInit?: OmitInit;
        dependencies?: D;
        init?: (value: T, dependencies: D) => Raw | undefined;
    },
): Field<T, OmitInit, D, Raw> {
    const field: Field<T, OmitInit, D, Raw> = {
        size,
        type: type,
        serialize:
            type === "default"
                ? (
                      source,
                      context:
                          | FieldDefaultSerializeContext
                          | FieldByobSerializeContext,
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ): any => {
                      if ("buffer" in context) {
                          const buffer = (
                              serialize as (
                                  source: Raw,
                                  context: FieldDefaultSerializeContext,
                              ) => Uint8Array
                          )(source, context);
                          context.buffer.set(buffer, context.index);
                          return buffer.length;
                      } else {
                          return (
                              serialize as (
                                  source: Raw,
                                  context: FieldDefaultSerializeContext,
                              ) => Uint8Array
                          )(source, context);
                      }
                  }
                : (
                      source,
                      context:
                          | FieldDefaultSerializeContext
                          | FieldByobSerializeContext,
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ): any => {
                      if ("buffer" in context) {
                          context.index ??= 0;
                          serialize(source, context as never);
                          return size;
                      } else {
                          const buffer = new Uint8Array(size);
                          serialize(source, {
                              buffer,
                              index: 0,
                              littleEndian: context.littleEndian,
                          });
                          return buffer;
                      }
                  },
        deserialize: bipedal(deserialize) as never,
        omitInit: options?.omitInit,
    };
    if (options?.init) {
        field.init = options.init;
    }
    return field;
}

export const field = _field;
