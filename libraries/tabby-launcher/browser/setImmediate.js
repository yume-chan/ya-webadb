export function setImmediate(callback) {
    Promise.resolve().then(callback);
}
