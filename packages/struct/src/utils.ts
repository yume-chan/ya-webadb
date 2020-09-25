export type Identity<T> = T;

export type Evaluate<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

export type Overwrite<TBase extends object, TNew extends object> =
    Evaluate<Omit<TBase, keyof TNew> & TNew>;

export type OmitNever<T> = Pick<T, { [K in keyof T]: [T[K]] extends [never] ? never : K }[keyof T]>;

export function placeholder<T>(): T {
    return undefined as unknown as T;
}
