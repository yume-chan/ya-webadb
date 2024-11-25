import type { PushReadableStreamController } from "@yume-chan/stream-extra";
import { PushReadableStream } from "@yume-chan/stream-extra";
import type { AsyncExactReadable } from "@yume-chan/struct";
import { string, struct, u32 } from "@yume-chan/struct";

import type { ScrcpyDeviceMessageParser } from "../../base/index.js";

export const ClipboardDeviceMessage = struct(
    { content: string(u32) },
    { littleEndian: false },
);

export class ClipboardStream
    extends PushReadableStream<string>
    implements ScrcpyDeviceMessageParser
{
    #controller: PushReadableStreamController<string>;

    constructor() {
        let controller!: PushReadableStreamController<string>;
        super((controller_) => {
            controller = controller_;
        });
        this.#controller = controller;
    }

    async parse(id: number, stream: AsyncExactReadable): Promise<boolean> {
        if (id === 0) {
            const message = await ClipboardDeviceMessage.deserialize(stream);
            await this.#controller.enqueue(message.content);
            return true;
        }
        return false;
    }

    close() {
        this.#controller.close();
    }

    error(e?: unknown) {
        this.#controller.error(e);
    }
}
