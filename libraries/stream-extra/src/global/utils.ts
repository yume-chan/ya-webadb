export type GlobalPrototypeOr<K extends string, Or> =
    typeof globalThis extends Record<K, { prototype: infer T }> ? T : Or;

export type GlobalValueOr<K extends string, Or> =
    typeof globalThis extends Record<K, infer T> ? T : Or;

/** #__NO_SIDE_EFFECTS__ */
export function getGlobalValue<T>(key: string) {
    return (globalThis as unknown as Record<string, T>)[key]!;
}
