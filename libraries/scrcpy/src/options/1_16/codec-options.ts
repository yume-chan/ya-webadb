import type { AndroidCodecLevel, AndroidCodecProfile } from '../../codec.js';
import type { ScrcpyOptionValue } from '../types.js';

export interface CodecOptionsInit {
    profile: AndroidCodecProfile;
    level: AndroidCodecLevel;

    iFrameInterval: number;
    repeatPreviousFrameAfter: number;
    maxPtsGapToEncoder: number;
}

function toDashCase(input: string) {
    return input.replace(/([A-Z])/g, '-$1').toLowerCase();
}

const CODEC_OPTION_TYPES: Partial<Record<keyof CodecOptionsInit, 'long' | 'float' | 'string'>> = {
    repeatPreviousFrameAfter: 'long',
    maxPtsGapToEncoder: 'long',
};

export class CodecOptions implements ScrcpyOptionValue {
    public value: Partial<CodecOptionsInit>;

    public constructor(value: Partial<CodecOptionsInit>) {
        this.value = value;
    }

    public toOptionValue(): string | undefined {
        const entries = Object.entries(this.value)
            .filter(([key, value]) => value !== undefined);

        if (entries.length === 0) {
            return undefined;
        }

        return entries
            .map(([key, value]) => {
                const type = CODEC_OPTION_TYPES[key as keyof CodecOptionsInit];
                return `${toDashCase(key)}${type ? `:${type}` : ''}=${value}`;
            })
            .join(',');
    }
}
