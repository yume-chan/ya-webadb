declare global {
    interface ArrayBuffer {
        // Disallow assigning `Arraybuffer` to `Uint8Array`
        __brand: never;
    }

    interface SharedArrayBuffer {
        // Allow `SharedArrayBuffer` to be assigned to `ArrayBuffer`
        __brand: never;
    }
}

export * from './basic';
export * from './struct';
export { Struct as default } from './struct';
export * from './types';
export * from './utils';
