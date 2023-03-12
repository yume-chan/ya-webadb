import {
    getBigInt64,
    getBigUint64,
    setBigInt64,
    setBigUint64,
} from "./pure.js";

if (!("getBigInt64" in DataView)) {
    DataView.prototype.getBigInt64 = function (byteOffset, littleEndian) {
        return getBigInt64(this, byteOffset, littleEndian);
    };
}

if (!("getBigUint64" in DataView)) {
    DataView.prototype.getBigUint64 = function (byteOffset, littleEndian) {
        return getBigUint64(this, byteOffset, littleEndian);
    };
}

if (!("setBigInt64" in DataView)) {
    DataView.prototype.setBigInt64 = function (
        byteOffset,
        value,
        littleEndian
    ) {
        setBigInt64(this, byteOffset, value, littleEndian);
    };
}

if (!("setBigUint64" in DataView)) {
    DataView.prototype.setBigUint64 = function (
        byteOffset,
        value,
        littleEndian
    ) {
        setBigUint64(this, byteOffset, value, littleEndian);
    };
}
