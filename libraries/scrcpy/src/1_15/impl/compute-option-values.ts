type ComputeOptionType<T, TDefault> = undefined extends T
    ? Exclude<T, undefined> | TDefault
    : T;

export type ComputeOptionTypes<T extends object, TDefaults extends object> = {
    [K in keyof TDefaults]: K extends keyof T
        ? ComputeOptionType<T[K], TDefaults[K]>
        : TDefaults[K];
};

export function computeOptionValues<T extends object, TDefaults extends object>(
    options: T,
    defaults: TDefaults,
): ComputeOptionTypes<T, TDefaults> {
    return Object.fromEntries(
        Object.entries(defaults).map(([key, value]) => {
            if (key in options) {
                const optionValue = options[key as keyof T];
                if (optionValue !== undefined) {
                    return [key, optionValue];
                }
            }
            return [key, value];
        }),
    ) as never;
}
