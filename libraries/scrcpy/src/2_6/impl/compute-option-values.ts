import { PrevImpl } from "./prev.js";

type ComputeAudioSource<TAudioDup, TAudioSource> = TAudioDup extends true
    ? true extends TAudioDup
        ? "playback"
        : TAudioSource | "playback"
    : TAudioSource;

type OverrideAudioSource<T> = Omit<T, "audioSource"> & {
    audioSource: ComputeAudioSource<
        T extends { audioDup: infer TAudioDup } ? TAudioDup : never,
        T extends { audioSource: infer TAudioSource } ? TAudioSource : never
    >;
};

export type ComputeOptionTypes<
    T extends object,
    TDefaults extends object,
> = OverrideAudioSource<PrevImpl.ComputeOptionTypes<T, TDefaults>>;

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
    const value = PrevImpl.computeOptionValues(options, defaults);
    if (value.audioDup) {
        value.audioSource = "playback" as never;
    }
    return value as never;
}
