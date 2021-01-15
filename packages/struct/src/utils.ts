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
export type Overwrite<TBase extends object, TNew extends object> =
    Evaluate<Omit<TBase, keyof TNew> & TNew>;

/**
 * Remove fields with `never` type
 */
export type OmitNever<T> = Pick<T, { [K in keyof T]: [T[K]] extends [never] ? never : K }[keyof T]>;

/**
 * Extract keys of fields in `T` that has type `TValue`
 */
export type KeysOfType<T, TValue> =
    { [TKey in keyof T]: T[TKey] extends TValue ? TKey : never }[keyof T];

export type ValueOrPromise<T> = T | Promise<T>;


/**
 * Returns a (fake) value of the given type.
 */
export function placeholder<T>(): T {
    return undefined as unknown as T;
}
