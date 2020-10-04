import { Struct, StructValueType } from "@yume-chan/struct";
import { Adb } from '../adb';
import { AdbBufferedStream } from '../stream';

const Version = new Struct({ littleEndian: true }).uint32('version');

export const AdbFrameBufferV1 =
    new Struct({ littleEndian: true })
        .uint32('bpp')
        .uint32('size')
        .uint32('width')
        .uint32('height')
        .uint32('red_offset')
        .uint32('red_length')
        .uint32('blue_offset')
        .uint32('blue_length')
        .uint32('green_offset')
        .uint32('green_length')
        .uint32('alpha_offset')
        .uint32('alpha_length')
        .arrayBuffer('data', { lengthField: 'size' });

export type AdbFrameBufferV1 = StructValueType<typeof AdbFrameBufferV1>;

export const AdbFrameBufferV2 =
    new Struct({ littleEndian: true })
        .uint32('bpp')
        .uint32('colorSpace')
        .uint32('size')
        .uint32('width')
        .uint32('height')
        .uint32('red_offset')
        .uint32('red_length')
        .uint32('blue_offset')
        .uint32('blue_length')
        .uint32('green_offset')
        .uint32('green_length')
        .uint32('alpha_offset')
        .uint32('alpha_length')
        .arrayBuffer('data', { lengthField: 'size' });

export type AdbFrameBufferV2 = StructValueType<typeof AdbFrameBufferV2>;

export async function framebuffer(adb: Adb) {
    const stream = await adb.createStream('framebuffer:\0');
    const buffered = new AdbBufferedStream(stream);
    const { version } = await Version.deserialize(buffered);
    switch (version) {
        case 1:
            return AdbFrameBufferV1.deserialize(buffered);
        case 2:
            return AdbFrameBufferV2.deserialize(buffered);
        default:
            throw new Error('Unknown FrameBuffer version');
    }
}
