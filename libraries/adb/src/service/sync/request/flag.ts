export const SyncFlag = {
    None: 0,
    Brotli: 1,
    Lz4: 2,
    Zstd: 4,
    DryRun: 0x80000000,
} as const;

export type SyncFlag = (typeof SyncFlag)[keyof typeof SyncFlag];
