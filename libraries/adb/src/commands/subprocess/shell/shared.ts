import type { StructValue } from "@yume-chan/struct";
import { buffer, struct, u32, u8 } from "@yume-chan/struct";

export const AdbShellProtocolId = {
    Stdin: 0,
    Stdout: 1,
    Stderr: 2,
    Exit: 3,
    CloseStdin: 4,
    WindowSizeChange: 5,
} as const;

export type AdbShellProtocolId =
    (typeof AdbShellProtocolId)[keyof typeof AdbShellProtocolId];

// This packet format is used in both directions.
export const AdbShellProtocolPacket = struct(
    {
        id: u8<AdbShellProtocolId>(),
        data: buffer(u32),
    },
    { littleEndian: true },
);

export type AdbShellProtocolPacket = StructValue<typeof AdbShellProtocolPacket>;
