export function hexDigits(value: number) {
    return value.toString(16).toUpperCase();
}

export function hexTwoDigits(value: number) {
    return value.toString(16).toUpperCase().padStart(2, "0");
}

export function decimalTwoDigits(value: number) {
    return value.toString(10).padStart(2, "0");
}
