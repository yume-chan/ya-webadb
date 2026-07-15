import type { ComputeOptionTypes as ComputeOptionTypes1_15 } from "../../1_15/impl/index.js";
import { computeOptionValues as computeOptionValues1_15 } from "../../1_15/impl/index.js";

import { PrevImpl } from "./prev.js";

type ComputeControl<TVideoSource, TControl> = TVideoSource extends "camera"
    ? "camera" extends TVideoSource
        ? false
        : TControl | false
    : TControl;

type OverrideControl<T> = Omit<T, "control"> & {
    control: ComputeControl<
        T extends { videoSource: infer TVideoSource } ? TVideoSource : never,
        T extends { control: infer TControl } ? TControl : never
    >;
};

export type ComputeOptionTypes<
    T extends object,
    TDefaults extends object,
> = PrevImpl.OverrideClipboardAutosync<
    OverrideControl<ComputeOptionTypes1_15<T, TDefaults>>
>;

export function computeOptionValues<
    T extends {
        videoSource?: string | undefined;
        control?: boolean | undefined;
        clipboardAutosync?: boolean | undefined;
    },
    TDefaults extends {
        videoSource: string;
        control: boolean;
        clipboardAutosync: boolean;
    },
>(options: T, defaults: TDefaults): ComputeOptionTypes<T, TDefaults> {
    const value = computeOptionValues1_15(options, defaults);
    if (value.videoSource !== "display") {
        value.control = false as never;
    }
    PrevImpl.overrideClipboardAutosync(value as never);
    return value as never;
}
