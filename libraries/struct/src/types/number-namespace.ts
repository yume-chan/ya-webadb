import {
    getInt16,
    getInt32,
    getInt8,
    getUint16,
    getUint32,
    setInt16,
    setInt32,
    setUint16,
    setUint32,
} from "@yume-chan/no-data-view";
import type { NumberFieldVariant } from "./number-reexports.js";

export const Uint8: NumberFieldVariant = {
    signed: false,
    size: 1,
    deserialize(array) {
        return array[0]!;
    },
    serialize(array, offset, value) {
        array[offset] = value;
    },
};

export const Int8: NumberFieldVariant = {
    signed: true,
    size: 1,
    deserialize(array) {
        return getInt8(array, 0);
    },
    serialize(array, offset, value) {
        array[offset] = value;
    },
};

export const Uint16: NumberFieldVariant = {
    signed: false,
    size: 2,
    deserialize(array, littleEndian) {
        return getUint16(array, 0, littleEndian);
    },
    serialize: setUint16,
};

export const Int16: NumberFieldVariant = {
    signed: true,
    size: 2,
    deserialize(array, littleEndian) {
        return getInt16(array, 0, littleEndian);
    },
    serialize: setInt16,
};

export const Uint32: NumberFieldVariant = {
    signed: false,
    size: 4,
    deserialize(array, littleEndian) {
        return getUint32(array, 0, littleEndian);
    },
    serialize: setUint32,
};

export const Int32: NumberFieldVariant = {
    signed: true,
    size: 4,
    deserialize(array, littleEndian) {
        return getInt32(array, 0, littleEndian);
    },
    serialize: setInt32,
};
