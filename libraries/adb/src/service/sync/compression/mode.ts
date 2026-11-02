export const Mode = {
    Compress: 0,
    Decompress: 1,
} as const;

export type Mode = (typeof Mode)[keyof typeof Mode];
