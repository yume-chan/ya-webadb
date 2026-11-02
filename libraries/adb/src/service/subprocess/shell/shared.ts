import type { StructValue } from "@yume-chan/struct";
import { buffer, struct, u32, u8 } from "@yume-chan/struct";

/** @internal */
export const AdbShellProtocolId = {
    Stdin: 0,
    Stdout: 1,
    Stderr: 2,
    Exit: 3,
    CloseStdin: 4,
    WindowSizeChange: 5,
} as const;

/** @internal */
export type AdbShellProtocolId =
    (typeof AdbShellProtocolId)[keyof typeof AdbShellProtocolId];

// This packet format is used in both directions.
/** @internal */
export const AdbShellProtocolPacket = struct(
    {
        id: u8<AdbShellProtocolId>(),
        data: buffer(u32),
    },
    { littleEndian: true },
);

// `StructValue` and `StructInit` is same for `AdbShellProtocolPacket`.
/** @internal */
export type AdbShellProtocolPacket = StructValue<typeof AdbShellProtocolPacket>;
