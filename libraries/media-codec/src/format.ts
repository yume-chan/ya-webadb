export function hexDigits(value: number) {
    if (value % 1 !== 0) {
        // This also checks NaN and Infinity
        throw new Error("Value must be an integer");
    }

    if (value < 0) {
        throw new Error("Value must be positive");
    }

    return value.toString(16).toUpperCase();
}

export function hexTwoDigits(value: number) {
    if (value % 1 !== 0) {
        // This also checks NaN and Infinity
        throw new Error("Value must be an integer");
    }

    if (value < 0) {
        throw new Error("Value must be positive");
    }

    if (value >= 256) {
        throw new Error("Value must be less than 256");
    }

    // Small optimization
    if (value < 16) {
        return "0" + value.toString(16).toUpperCase();
    }
    return value.toString(16).toUpperCase();
}

export function decimalTwoDigits(value: number) {
    if (value % 1 !== 0) {
        // This also checks NaN and Infinity
        throw new Error("Value must be an integer");
    }

    if (value < 0) {
        throw new Error("Value must be positive");
    }

    if (value >= 100) {
        throw new Error("Value must be less than 256");
    }

    if (value < 10) {
        return "0" + value.toString(10);
    }
    return value.toString(10);
}
