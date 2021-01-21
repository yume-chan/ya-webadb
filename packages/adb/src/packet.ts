import Struct from '@yume-chan/struct';
import { AdbBackend } from './backend';
import { BufferedStream } from './stream';

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

const AdbPacketStruct =
    new Struct({ littleEndian: true })
        .fields(AdbPacketHeader)
        .arrayBuffer('payload', { lengthField: 'payloadLength' });

export type AdbPacket = typeof AdbPacketStruct['TDeserializeResult'];

export type AdbPacketInit = Omit<typeof AdbPacketStruct['TInit'], 'checksum' | 'magic'>;

export namespace AdbPacket {
    export async function read(backend: AdbBackend): Promise<AdbPacket> {
        let buffer = await backend.read(24);

        // Detect boundary
        // Note that it relies on the backend to only return data from one write operation
        while (buffer.byteLength !== 24) {
            // Maybe it's a payload from last connection.
            // Ignore and try again
            buffer = await backend.read(24);
        }

        let bufferUsed = false;
        const stream = new BufferedStream({
            read(length: number) {
                if (!bufferUsed) {
                    bufferUsed = true;
                    return buffer;
                }
                return backend.read(length);
            }
        });

        return AdbPacketStruct.deserialize({
            read: stream.read.bind(stream),
            decodeUtf8: backend.decodeUtf8.bind(backend),
            encodeUtf8: backend.encodeUtf8.bind(backend),
        });
    }

    export async function write(
        init: AdbPacketInit,
        calculateChecksum: boolean,
        backend: AdbBackend
    ): Promise<void> {
        let checksum: number;
        if (calculateChecksum && init.payload) {
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

        // Write payload separately to avoid an extra copy
        const header = AdbPacketHeader.serialize(packet, backend);
        await backend.write(header);
        if (packet.payload.byteLength) {
            await backend.write(packet.payload);
        }
    }
}
