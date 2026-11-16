import type { PushReadableStreamController } from "@yume-chan/stream-extra";
import { PushReadableStream, tryClose } from "@yume-chan/stream-extra";
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

export class UHidOutputStream implements ScrcpyDeviceMessageParser {
    #controllers = new Map<
        number,
        PushReadableStreamController<UHidOutputDeviceMessage>
    >();

    readonly id = 2;

    async parse(_id: number, stream: AsyncExactReadable): Promise<undefined> {
        const message = await UHidOutputDeviceMessage.deserialize(stream);
        const id = message.id;

        const controller = this.#controllers.get(id);
        if (!controller) {
            throw new Error(`Unregistered device ID: ${id}`);
        }
        await controller.enqueue(message);
    }

    addDevice(id: number) {
        if (this.#controllers.has(id)) {
            throw new Error(`Device ID already exists: ${id}`);
        }

        let controller: PushReadableStreamController<UHidOutputDeviceMessage>;
        const stream = new PushReadableStream<UHidOutputDeviceMessage>(
            (controller_) => {
                controller = controller_;
            },
        );
        this.#controllers.set(id, controller!);
        return stream;
    }

    deleteDevice(id: number) {
        const controller = this.#controllers.get(id);
        if (!controller) {
            throw new Error(`Unregistered device ID: ${id}`);
        }
        tryClose(controller);
        this.#controllers.delete(id);
    }

    close() {
        for (const controller of this.#controllers.values()) {
            tryClose(controller);
        }
    }

    error(e?: unknown) {
        for (const controller of this.#controllers.values()) {
            controller.error(e);
        }
    }
}
