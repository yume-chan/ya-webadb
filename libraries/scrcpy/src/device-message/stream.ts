import { BufferedTransformStream } from "@yume-chan/stream-extra";
import {
    ExactReadableEndedError,
    StructEmptyError,
    StructNotEnoughDataError,
} from "@yume-chan/struct";

import { ScrcpyAckClipboardDeviceMessage } from "./ack-clipboard.js";
import { ScrcpyClipboardDeviceMessage } from "./clipboard.js";
import { ScrcpyDeviceMessageType } from "./type.js";

export type ScrcpyDeviceMessage =
    | ScrcpyClipboardDeviceMessage
    | ScrcpyAckClipboardDeviceMessage;

export class ScrcpyDeviceMessageDeserializeStream extends BufferedTransformStream<ScrcpyDeviceMessage> {
    constructor() {
        super(async (stream) => {
            try {
                const type = await stream.readExactly(1);
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
                        throw new Error("Unsupported control message type");
                }
            } catch (e) {
                // Can't read the `type` byte
                if (e instanceof ExactReadableEndedError) {
                    throw new StructEmptyError();
                }

                // Can't read struct body,
                // treat as not enough data because `type` byte is already read
                if (e instanceof StructEmptyError) {
                    throw new StructNotEnoughDataError();
                }

                throw e;
            }
        });
    }
}
