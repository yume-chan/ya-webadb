/**
 * When evaluating a very complex generic type alias,
 * tell TypeScript to use `T`, instead of current type alias' name, as the result type name
 *
 * Example:
 *
 * ```ts
 * type WithIdentity<T> = Identity<SomeType<T>>;
 * type WithoutIdentity<T> = SomeType<T>;
 *
 * type WithIdentityResult = WithIdentity<number>;
 * // Hover on this one shows `SomeType<number>`
 *
 * type WithoutIdentityResult = WithoutIdentity<number>;
 * // Hover on this one shows `WithoutIdentity<number>`
 * ```
 */
export type Identity<T> = T;

/**
 * Collapse an intersection type (`{ foo: string } & { bar: number }`) to a simple type (`{ foo: string, bar: number }`)
 */
export type Evaluate<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

/**
 * Overwrite fields in `TBase` with fields in `TNew`
 */
export type Overwrite<TBase extends object, TNew extends object> = Evaluate<
    Omit<TBase, keyof TNew> & TNew
>;

/**
 * Remove fields with `never` type
 */
export type OmitNever<T> = Pick<
    T,
    { [K in keyof T]: [T[K]] extends [never] ? never : K }[keyof T]
>;

/**
 * Extract keys of fields in `T` that has type `TValue`
 */
export type KeysOfType<T, TValue> = {
    [TKey in keyof T]: T[TKey] extends TValue ? TKey : never;
}[keyof T];

export type ValueOrPromise<T> = T | PromiseLike<T>;

/**
 * Returns a (fake) value of the given type.
 */
export function placeholder<T>(): T {
    return undefined as unknown as T;
}

// This library can't use `@types/node` or `lib: dom`
// because they will pollute the global scope
// So `TextEncoder` and `TextDecoder` types are not available

// Node.js 8.3 ships `TextEncoder` and `TextDecoder` in `util` module.
// But using top level await to load them requires Node.js 14.1.
// So there is no point to do that. Let's just assume they exist in global.

declare class TextEncoderType {
    constructor();

    encode(input: string): Uint8Array;
}

declare class TextDecoderType {
    constructor();

    decode(buffer: ArrayBufferView | ArrayBuffer): string;
}

interface GlobalExtension {
    TextEncoder: typeof TextEncoderType;
    TextDecoder: typeof TextDecoderType;
}

const { TextEncoder, TextDecoder } = globalThis as unknown as GlobalExtension;

const Utf8Encoder = new TextEncoder();
const Utf8Decoder = new TextDecoder();

export function encodeUtf8(input: string): Uint8Array {
    return Utf8Encoder.encode(input);
}

export function decodeUtf8(buffer: ArrayBufferView | ArrayBuffer): string {
    return Utf8Decoder.decode(buffer);
}
