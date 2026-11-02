import { Consumable, TransformStream } from "@yume-chan/stream-extra";
import type { StructInit, StructValue } from "@yume-chan/struct";
import { buffer, extend, s32, struct, u32 } from "@yume-chan/struct";

export const AdbCommand = {
    Auth: 0x48545541, // 'AUTH'
    Close: 0x45534c43, // 'CLSE'
    Connect: 0x4e584e43, // 'CNXN'
    Okay: 0x59414b4f, // 'OKAY'
    Open: 0x4e45504f, // 'OPEN'
    Write: 0x45545257, // 'WRTE'
} as const;

export type AdbCommand = (typeof AdbCommand)[keyof typeof AdbCommand];

export const AdbPacketHeader = struct(
    {
        command: u32,
        arg0: u32,
        arg1: u32,
        payloadLength: u32,
        checksum: u32,
        magic: s32,
    },
    { littleEndian: true },
);

export type AdbPacketHeader = StructValue<typeof AdbPacketHeader>;

type AdbPacketHeaderInit = StructInit<typeof AdbPacketHeader>;

export const AdbPacket = extend(AdbPacketHeader, {
    payload: buffer("payloadLength"),
});

export type AdbPacket = StructValue<typeof AdbPacket>;

/**
 * `AdbPacketData` contains all the useful fields of `AdbPacket`.
 *
 * `AdvDaemonConnection#connect` will return a `ReadableStream<AdbPacketData>`,
 * allow each connection to encode `AdbPacket` in different methods.
 *
 * `AdbDaemonConnection#connect` will return a `WritableStream<AdbPacketInit>`,
 * however, `AdbDaemonTransport` will transform `AdbPacketData` to `AdbPacketInit` for you,
 * so `AdbSocket#writable#write` only needs `AdbPacketData`.
 */
export type AdbPacketData = Omit<
    StructInit<typeof AdbPacket>,
    "checksum" | "magic"
>;

export type AdbPacketInit = StructInit<typeof AdbPacket>;

export function calculateChecksum(payload: Uint8Array): number {
    return payload.reduce((result, item) => result + item, 0);
}

export class AdbPacketSerializeStream extends TransformStream<
    Consumable<AdbPacketInit>,
    Consumable<Uint8Array>
> {
    constructor() {
        const headerBuffer = new Uint8Array(AdbPacketHeader.size);
        super({
            transform: async (chunk, controller) => {
                await chunk.tryConsume(async (chunk) => {
                    const init = chunk as AdbPacketInit & AdbPacketHeaderInit;
                    init.payloadLength = init.payload.length;

                    AdbPacketHeader.serialize(init, headerBuffer);
                    await Consumable.ReadableStream.enqueue(
                        controller,
                        headerBuffer,
                    );

                    if (init.payloadLength) {
                        // USB protocol preserves packet boundaries,
                        // so we must write payload separately as native ADB does,
                        // otherwise the read operation on device will fail.
                        await Consumable.ReadableStream.enqueue(
                            controller,
                            init.payload,
                        );
                    }
                });
            },
        });
    }
}
