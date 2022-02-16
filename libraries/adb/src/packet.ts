import Struct from '@yume-chan/struct';
import { TransformStream } from "./utils";

export enum AdbCommand {
    Auth = 0x48545541,    // 'AUTH'
    Close = 0x45534c43,   // 'CLSE'
    Connect = 0x4e584e43, // 'CNXN'
    OK = 0x59414b4f,      // 'OKAY'
    Open = 0x4e45504f,    // 'OPEN'
    Write = 0x45545257,   // 'WRTE'
}

const AdbPacketHeader =
    new Struct({ littleEndian: true })
        .uint32('command')
        .uint32('arg0')
        .uint32('arg1')
        .uint32('payloadLength')
        .uint32('checksum')
        .int32('magic');

export const AdbPacket =
    new Struct({ littleEndian: true })
        .fields(AdbPacketHeader)
        .arrayBuffer('payload', { lengthField: 'payloadLength' });

export type AdbPacket = typeof AdbPacket['TDeserializeResult'];

export type AdbPacketInit = Omit<typeof AdbPacket['TInit'], 'checksum' | 'magic'>;

export class AdbPacketSerializeStream extends TransformStream<AdbPacketInit, ArrayBuffer>{
    public calculateChecksum = true;

    public constructor() {
        super({
            transform: async (init, controller) => {
                let checksum: number;
                if (this.calculateChecksum && init.payload) {
                    const array = new Uint8Array(init.payload);
                    checksum = array.reduce((result, item) => result + item, 0);
                } else {
                    checksum = 0;
                }

                const packet = {
                    ...init,
                    checksum,
                    magic: init.command ^ 0xFFFFFFFF,
                    payloadLength: init.payload.byteLength,
                };

                controller.enqueue(AdbPacketHeader.serialize(packet));

                if (packet.payloadLength) {
                    controller.enqueue(packet.payload);
                }
            },
        });
    }
}
