import type { PushReadableStreamController } from "@yume-chan/stream-extra";
import { PushReadableStream } from "@yume-chan/stream-extra";
import type { AsyncExactReadable } from "@yume-chan/struct";
import { string, struct, u32 } from "@yume-chan/struct";

import type { ScrcpyDeviceMessageHandler } from "../../base/index.js";

export const ClipboardDeviceMessage = struct(
    { content: string(u32) },
    { littleEndian: false },
);

export class ClipboardStream
    extends PushReadableStream<string>
    implements ScrcpyDeviceMessageHandler
{
    #controller: PushReadableStreamController<string>;

    constructor() {
        let controller!: PushReadableStreamController<string>;
        super((controller_) => {
            controller = controller_;
        });
        this.#controller = controller;
    }

    async parse(stream: AsyncExactReadable): Promise<undefined> {
        const message = await ClipboardDeviceMessage.deserialize(stream);
        await this.#controller.enqueue(message.content);
    }

    close() {
        this.#controller.close();
    }

    error(e?: unknown) {
        this.#controller.error(e);
    }
}
