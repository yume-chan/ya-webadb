import { BufferedTransformStream } from '@yume-chan/stream-extra';
import { ScrcpyClipboardDeviceMessage } from './clipboard.js';

export type ScrcpyDeviceMessage =
    | ScrcpyClipboardDeviceMessage;

export class ScrcpyDeviceMessageDeserializeStream extends BufferedTransformStream<ScrcpyDeviceMessage> {
    constructor() {
        super(async (stream) => {
            const type = await stream.read(1);
            switch (type[0]) {
                case 0:
                    return await ScrcpyClipboardDeviceMessage.deserialize(stream);
                default:
                    throw new Error('unknown control message type');
            }
        })
    }
}
