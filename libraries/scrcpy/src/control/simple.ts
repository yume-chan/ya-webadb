import Struct from '@yume-chan/struct';

export const ScrcpySimpleControlMessage =
    new Struct()
        .uint8('type');
