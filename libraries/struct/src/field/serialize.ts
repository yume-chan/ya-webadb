import type {
    FieldByobSerializeContext,
    FieldDefaultSerializeContext,
    FieldSerializer,
} from "./types.js";

export type DefaultFieldSerializer<T> = (
    source: T,
    context: FieldDefaultSerializeContext,
) => Uint8Array;

/* Adapt default field serializer to universal field serializer */
export function defaultFieldSerializer<T>(
    serializer: DefaultFieldSerializer<T>,
): FieldSerializer<T>["serialize"] {
    return (
        source,
        context: FieldDefaultSerializeContext | FieldByobSerializeContext,
    ): never => {
        if ("buffer" in context) {
            const buffer = serializer(source, context);
            context.buffer.set(buffer, context.index);
            return buffer.length as never;
        } else {
            return serializer(source, context) as never;
        }
    };
}

export type ByobFieldSerializer<T> = (
    source: T,
    context: FieldByobSerializeContext & { index: number },
) => void;

/* Adapt byob field serializer to universal field serializer */
export function byobFieldSerializer<T>(
    size: number,
    serializer: ByobFieldSerializer<T>,
): FieldSerializer<T>["serialize"] {
    return (
        source,
        context: FieldDefaultSerializeContext | FieldByobSerializeContext,
    ): never => {
        if ("buffer" in context) {
            context.index ??= 0;
            serializer(source, context as never);
            return size as never;
        } else {
            const buffer = new Uint8Array(size);
            serializer(source, {
                buffer,
                index: 0,
                littleEndian: context.littleEndian,
            });
            return buffer as never;
        }
    };
}
