import { BufferedTransformStream } from "@yume-chan/stream-extra";

import { ScrcpyAckClipboardDeviceMessage } from "./ack-clipboard.js";
import { ScrcpyClipboardDeviceMessage } from "./clipboard.js";
import { ScrcpyDeviceMessageType } from "./type.js";

export type ScrcpyDeviceMessage =
    | ScrcpyClipboardDeviceMessage
    | ScrcpyAckClipboardDeviceMessage;

export class ScrcpyDeviceMessageDeserializeStream extends BufferedTransformStream<ScrcpyDeviceMessage> {
    constructor() {
        super(async (stream) => {
            const type = await stream.read(1);
            switch (type[0]) {
                case ScrcpyDeviceMessageType.Clipboard:
                    return await ScrcpyClipboardDeviceMessage.deserialize(
                        stream
                    );
                case ScrcpyDeviceMessageType.AckClipboard:
                    return await ScrcpyAckClipboardDeviceMessage.deserialize(
                        stream
                    );
                default:
                    throw new Error("unknown control message type");
            }
        });
    }
}
