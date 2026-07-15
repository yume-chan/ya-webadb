import type { ComputeOptionTypes as ComputeOptionTypes1_15 } from "../../1_15/impl/index.js";
import { computeOptionValues as computeOptionValues1_15 } from "../../1_15/impl/index.js";

import { PrevImpl } from "./prev.js";

export type ComputeOptionTypes<
    T extends object,
    TDefaults extends object,
> = PrevImpl.OverrideAudioSource<
    PrevImpl.OverrideClipboardAutosync<ComputeOptionTypes1_15<T, TDefaults>>
>;

export function computeOptionValues<
    T extends {
        videoSource?: string | undefined;
        control?: boolean | undefined;
        audioDup?: boolean | undefined;
        audioSource?: string | undefined;
    },
    TDefaults extends {
        videoSource: string;
        control: boolean;
        audioDup: boolean;
        audioSource: string;
    },
>(options: T, defaults: TDefaults): ComputeOptionTypes<T, TDefaults> {
    const value = computeOptionValues1_15(options, defaults);
    PrevImpl.overrideClipboardAutosync(value as never);
    PrevImpl.overrideAudioSource(value as never);
    return value as never;
}
