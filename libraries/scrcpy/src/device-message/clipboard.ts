import Struct from '@yume-chan/struct';

export const ScrcpyClipboardDeviceMessage =
    new Struct()
        .uint32('length')
        .string('content', { lengthField: 'length' });

export type ScrcpyClipboardDeviceMessage =
    typeof ScrcpyClipboardDeviceMessage['TDeserializeResult'];
