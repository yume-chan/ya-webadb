export type Identity<T> = T;

export type Evaluate<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;
