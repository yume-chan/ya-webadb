declare global {
    interface ArrayBuffer {
        // Disallow assigning `Uint8Array` to `Arraybuffer`
        __brand: never;
    }

    interface SharedArrayBuffer {
        // Allow `SharedArrayBuffer` to be assigned to `ArrayBuffer`
        __brand: never;
    }
}

export * from "./basic/index.js";
export * from "./struct.js";
export { Struct as default } from "./struct.js";
export * from "./types/index.js";
export * from "./utils.js";
