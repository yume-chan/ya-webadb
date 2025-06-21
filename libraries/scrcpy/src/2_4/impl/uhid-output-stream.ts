import type { PushReadableStreamController } from "@yume-chan/stream-extra";
import { PushReadableStream } from "@yume-chan/stream-extra";
import type { AsyncExactReadable, StructValue } from "@yume-chan/struct";
import { buffer, struct, u16 } from "@yume-chan/struct";

import type { ScrcpyDeviceMessageParser } from "../../base/index.js";

export const UHidOutputDeviceMessage = struct(
    {
        id: u16,
        data: buffer(u16),
    },
    { littleEndian: false },
);

export type UHidOutputDeviceMessage = StructValue<
    typeof UHidOutputDeviceMessage
>;

export class UHidOutputStream
    extends PushReadableStream<UHidOutputDeviceMessage>
    implements ScrcpyDeviceMessageParser
{
    #controller: PushReadableStreamController<UHidOutputDeviceMessage>;

    readonly id = 2;

    constructor() {
        let controller!: PushReadableStreamController<UHidOutputDeviceMessage>;
        super((controller_) => {
            controller = controller_;
        });
        this.#controller = controller;
    }

    async parse(_id: number, stream: AsyncExactReadable): Promise<undefined> {
        const message = await UHidOutputDeviceMessage.deserialize(stream);
        await this.#controller.enqueue(message);
    }

    close() {
        this.#controller.close();
    }

    error(e?: unknown) {
        this.#controller.error(e);
    }
}
