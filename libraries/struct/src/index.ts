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

export * from "./bipedal.js";
export * from "./buffer.js";
export * from "./concat.js";
export * from "./extend.js";
export * from "./field/index.js";
export * from "./number.js";
export * from "./readable.js";
export * from "./string.js";
export * from "./struct.js";
export * from "./types.js";
export * from "./utils.js";
