const view = new DataView(new ArrayBuffer(8));

function nextUp(x: number) {
    if (Number.isNaN(x) || x === Infinity) return x;
    if (x === 0) return Number.MIN_VALUE;

    // Write the number as a float64
    view.setFloat64(0, x, false);

    let bits = view.getBigUint64(0, false);

    // If x > 0, increment bits; if x < 0, decrement bits
    bits += x > 0 ? 1n : -1n;

    view.setBigUint64(0, bits, false);
    return view.getFloat64(0, false);
}

let prevValue = 0;

export function increasingNow() {
    let now = performance.now();
    if (now <= prevValue) {
        now = nextUp(now);
    }
    prevValue = now;
    return now;
}
