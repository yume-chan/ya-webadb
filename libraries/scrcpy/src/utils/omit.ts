/* #__NO_SIDE_EFFECTS__ */
export function omit<T extends Record<string, unknown>, K extends (keyof T)[]>(
    value: T,
    ...keys: K
): T {
    return Object.fromEntries(
        Object.entries(value).filter(
            ([key]) => !keys.includes(key as K[number]),
        ),
    ) as never;
}
