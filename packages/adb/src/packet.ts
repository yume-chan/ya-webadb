import { BackingField, Struct, StructInitType, StructValueType } from '@yume-chan/struct';
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

const AdbPacketWithoutPayload =
    new Struct({ littleEndian: true })
        .uint32('command', undefined)
        .uint32('arg0')
        .uint32('arg1')
        .uint32('payloadLength')
        .uint32('checksum')
        .int32('magic');

const AdbPacketStruct =
    AdbPacketWithoutPayload
        .arrayBuffer('payload', { lengthField: 'payloadLength' })
        .afterParsed((value) => {
            if (value[BackingField].magic !== value.magic) {
                throw new Error('Invalid command');
            }
        });

export type AdbPacket = StructValueType<typeof AdbPacketStruct>;

export type AdbPacketInit = Omit<StructInitType<typeof AdbPacketStruct>, 'checksum' | 'magic'>;

export namespace AdbPacket {
    export function create(init: AdbPacketInit, backend: AdbBackend): AdbPacket {
        return AdbPacketStruct.create({
            ...init,
            checksum: 0,
            magic: init.command ^ 0xFFFFFFFF,
        }, backend);
    }

    export async function read(backend: AdbBackend): Promise<AdbPacket> {
        let buffer = await backend.read(24);
        if (buffer.byteLength !== 24) {
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

    export async function write(packet: AdbPacket, backend: AdbBackend): Promise<void> {
        // Write payload separately to avoid an extra copy
        await backend.write(AdbPacketWithoutPayload.serialize(packet, backend));
        if (packet.payload) {
            await backend.write(packet.payload);
        }
    }
}
