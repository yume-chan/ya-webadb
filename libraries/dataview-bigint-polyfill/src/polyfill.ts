import {
    getBigInt64,
    getBigUint64,
    setBigInt64,
    setBigUint64,
} from "./pure.js";

if (!Object.prototype.hasOwnProperty.call(DataView.prototype, "getBigInt64")) {
    DataView.prototype.getBigInt64 = function (byteOffset, littleEndian) {
        return getBigInt64(this, byteOffset, littleEndian);
    };
}

if (!Object.prototype.hasOwnProperty.call(DataView.prototype, "getBigUint64")) {
    DataView.prototype.getBigUint64 = function (byteOffset, littleEndian) {
        return getBigUint64(this, byteOffset, littleEndian);
    };
}

if (!Object.prototype.hasOwnProperty.call(DataView.prototype, "setBigInt64")) {
    DataView.prototype.setBigInt64 = function (
        byteOffset,
        value,
        littleEndian,
    ) {
        setBigInt64(this, byteOffset, value, littleEndian);
    };
}

if (!Object.prototype.hasOwnProperty.call(DataView.prototype, "setBigUint64")) {
    DataView.prototype.setBigUint64 = function (
        byteOffset,
        value,
        littleEndian,
    ) {
        setBigUint64(this, byteOffset, value, littleEndian);
    };
}
