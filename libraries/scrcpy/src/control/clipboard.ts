import Struct from '@yume-chan/struct';

export const ClipboardMessage =
    new Struct()
        .uint32('length')
        .string('content', { lengthField: 'length' });
