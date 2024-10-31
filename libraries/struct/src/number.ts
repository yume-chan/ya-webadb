import {
    getInt16,
    getInt32,
    getInt64,
    getInt8,
    getUint16,
    getUint32,
    setInt16,
    setInt32,
    setInt64,
    setUint16,
    setUint32,
} from "@yume-chan/no-data-view";

import { bipedal } from "./bipedal.js";
import type { Field } from "./field.js";

export const u8: Field<number, never, never> & {
    as: <T>(infer?: T) => Field<T, never, never>;
} = {
    size: 1,
    serialize(value, { buffer, index }) {
        buffer[index] = value;
    },
    deserialize: bipedal(function* (then, { reader }) {
        const data = yield* then(reader.readExactly(1));
        return data[0]!;
    }),
    as: () => u8 as never,
};

export const s8: Field<number, never, never> & {
    as: <T>(infer?: T) => Field<T, never, never>;
} = {
    size: 1,
    serialize(value, { buffer, index }) {
        buffer[index] = value;
    },
    deserialize: bipedal(function* (then, { reader }) {
        const data = yield* then(reader.readExactly(1));
        return getInt8(data, 0);
    }),
    as: () => s8 as never,
};

export const u16: Field<number, never, never> & {
    as: <T>(infer?: T) => Field<T, never, never>;
} = {
    size: 2,
    serialize(value, { buffer, index, littleEndian }) {
        setUint16(buffer, index, value, littleEndian);
    },
    deserialize: bipedal(function* (then, { reader, littleEndian }) {
        const data = yield* then(reader.readExactly(2));
        return getUint16(data, 0, littleEndian);
    }),
    as: () => u16 as never,
};

export const s16: Field<number, never, never> & {
    as: <T>(infer?: T) => Field<T, never, never>;
} = {
    size: 2,
    serialize(value, { buffer, index, littleEndian }) {
        setInt16(buffer, index, value, littleEndian);
    },
    deserialize: bipedal(function* (then, { reader, littleEndian }) {
        const data = yield* then(reader.readExactly(2));
        return getInt16(data, 0, littleEndian);
    }),
    as: () => s16 as never,
};

export const u32: Field<number, never, never> & {
    as: <T>(infer?: T) => Field<T, never, never>;
} = {
    size: 4,
    serialize(value, { buffer, index, littleEndian }) {
        setUint32(buffer, index, value, littleEndian);
    },
    deserialize: bipedal(function* (then, { reader, littleEndian }) {
        const data = yield* then(reader.readExactly(4));
        return getUint32(data, 0, littleEndian);
    }),
    as: () => u32 as never,
};

export const s32: Field<number, never, never> & {
    as: <T>(infer?: T) => Field<T, never, never>;
} = {
    size: 4,
    serialize(value, { buffer, index, littleEndian }) {
        setInt32(buffer, index, value, littleEndian);
    },
    deserialize: bipedal(function* (then, { reader, littleEndian }) {
        const data = yield* then(reader.readExactly(4));
        return getInt32(data, 0, littleEndian);
    }),
    as: () => s32 as never,
};

export const u64: Field<bigint, never, never> & {
    as: <T>(infer?: T) => Field<T, never, never>;
} = {
    size: 8,
    serialize(value, { buffer, index, littleEndian }) {
        setInt64(buffer, index, value, littleEndian);
    },
    deserialize: bipedal(function* (then, { reader, littleEndian }) {
        const data = yield* then(reader.readExactly(8));
        return getInt64(data, 0, littleEndian);
    }),
    as: () => u64 as never,
};

export const s64: Field<bigint, never, never> & {
    as: <T>(infer?: T) => Field<T, never, never>;
} = {
    size: 8,
    serialize(value, { buffer, index, littleEndian }) {
        setInt64(buffer, index, value, littleEndian);
    },
    deserialize: bipedal(function* (then, { reader, littleEndian }) {
        const data = yield* then(reader.readExactly(8));
        return getInt64(data, 0, littleEndian);
    }),
    as: () => s64 as never,
};
