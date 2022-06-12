import Struct from '@yume-chan/struct';

import { ScrcpySimpleControlMessage } from './simple.js';

export const ScrcpyInjectTextControlMessage =
    new Struct()
        .fields(ScrcpySimpleControlMessage)
        .uint32('length')
        .string('text', { lengthField: 'length' });

export type ScrcpyInjectTextControlMessage =
    typeof ScrcpyInjectTextControlMessage['TInit'];
