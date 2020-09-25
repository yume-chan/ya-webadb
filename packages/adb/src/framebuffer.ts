import { Struct, StructValueType } from "@yume-chan/struct";

export const FrameBuffer =
    new Struct({ littleEndian: true })
        .uint32('version', undefined, 2 as const)
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

export type FrameBuffer = StructValueType<typeof FrameBuffer>;
