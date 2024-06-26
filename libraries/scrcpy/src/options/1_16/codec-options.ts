import type { ScrcpyOptionValue } from "../types.js";

/**
 * If the option you need is not in this type,
 * please file an issue on GitHub.
 */
export interface CodecOptionsInit {
    profile?: number | undefined;
    level?: number | undefined;

    iFrameInterval?: number | undefined;
    maxBframes?: number | undefined;
    repeatPreviousFrameAfter?: number | undefined;
    maxPtsGapToEncoder?: number | undefined;
    intraRefreshPeriod?: number | undefined;
}

function toDashCase(input: string) {
    return input.replace(/([A-Z])/g, "-$1").toLowerCase();
}

const CODEC_OPTION_TYPES: Partial<
    Record<keyof CodecOptionsInit, "long" | "float" | "string">
> = {
    repeatPreviousFrameAfter: "long",
    maxPtsGapToEncoder: "long",
};

export class CodecOptions implements ScrcpyOptionValue {
    options: CodecOptionsInit;

    constructor(options: CodecOptionsInit = {}) {
        for (const [key, value] of Object.entries(options)) {
            if (value === undefined) {
                continue;
            }

            if (typeof value !== "number") {
                throw new Error(
                    `Invalid option value for ${key}: ${String(value)}`,
                );
            }
        }

        this.options = options;
    }

    toOptionValue(): string | undefined {
        const entries = Object.entries(this.options).filter(
            ([, value]) => value !== undefined,
        );

        if (entries.length === 0) {
            return undefined;
        }

        return entries
            .map(([key, value]) => {
                let result = toDashCase(key);

                const type = CODEC_OPTION_TYPES[key as keyof CodecOptionsInit];
                if (type) {
                    result += `:${type}`;
                }

                result += `=${value}`;
                return result;
            })
            .join(",");
    }
}
