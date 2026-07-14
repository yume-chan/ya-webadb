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
> = OverrideControl<PrevImpl.ComputeOptionTypes<T, TDefaults>>;

export function computeOptionValues<
    T extends {
        videoSource?: string | undefined;
        control?: boolean | undefined;
    },
    TDefaults extends { videoSource: string; control: boolean },
>(options: T, defaults: TDefaults): ComputeOptionTypes<T, TDefaults> {
    const value = PrevImpl.computeOptionValues(options, defaults);
    if (value.videoSource !== "display") {
        value.control = false as never;
    }
    return value as never;
}
