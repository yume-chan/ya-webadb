import { PrevImpl } from "./prev.js";

// Distributive Conditional Types
// (https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types)
type ComputeAudioSource<TAudioDup, TAudioSource> = TAudioDup extends true
    ? "playback"
    : TAudioSource;

export type OverrideAudioSource<T> = Omit<T, "audioSource"> & {
    audioSource: ComputeAudioSource<
        T extends { audioDup: infer TAudioDup } ? TAudioDup : never,
        T extends { audioSource: infer TAudioSource } ? TAudioSource : never
    >;
};

export type ComputeOptionTypes<
    T extends object,
    TDefaults extends object,
> = OverrideAudioSource<PrevImpl.ComputeOptionTypes<T, TDefaults>>;

export function overrideAudioSource<
    T extends { audioDup: boolean; audioSource: string },
>(value: T) {
    if (value.audioDup) {
        value.audioSource = "playback";
    }
}

export function computeOptionValues<
    T extends {
        videoSource?: string | undefined;
        control?: boolean | undefined;
        clipboardAutosync?: boolean | undefined;
        audioDup?: boolean | undefined;
        audioSource?: string | undefined;
    },
    TDefaults extends {
        videoSource: string;
        control: boolean;
        clipboardAutosync: boolean;
        audioDup: boolean;
        audioSource: string;
    },
>(options: T, defaults: TDefaults): ComputeOptionTypes<T, TDefaults> {
    const value = PrevImpl.computeOptionValues(options, defaults);
    overrideAudioSource(value as never);
    return value as never;
}
