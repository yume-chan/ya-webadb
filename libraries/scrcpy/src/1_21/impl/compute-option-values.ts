import { PrevImpl } from "./prev.js";

// Distributive Conditional Types
// (https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types)
type ComputeClipboardAutosync<TControl, TClipboardAutosync> =
    TControl extends false ? false : TClipboardAutosync;

export type OverrideClipboardAutosync<T> = Omit<T, "clipboardAutosync"> & {
    clipboardAutosync: ComputeClipboardAutosync<
        T extends { control: infer TControl } ? TControl : never,
        T extends { clipboardAutosync: infer TClipboardAutosync }
            ? TClipboardAutosync
            : never
    >;
};

export type ComputeOptionTypes<
    T extends object,
    TDefaults extends object,
> = OverrideClipboardAutosync<PrevImpl.ComputeOptionTypes<T, TDefaults>>;

export function overrideClipboardAutosync<
    T extends { control: boolean; clipboardAutosync: boolean },
>(value: T) {
    if (!value.control) {
        value.clipboardAutosync = false;
    }
}

export function computeOptionValues<
    T extends {
        control?: boolean | undefined;
        clipboardAutosync?: boolean | undefined;
    },
    TDefaults extends {
        control: boolean;
        clipboardAutosync: boolean;
    },
>(options: T, defaults: TDefaults): ComputeOptionTypes<T, TDefaults> {
    const value = PrevImpl.computeOptionValues(options, defaults);
    overrideClipboardAutosync(value as never);
    return value as never;
}
