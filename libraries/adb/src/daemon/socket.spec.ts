import assert from "node:assert";
import { describe, it, mock } from "node:test";

import { EmptyUint8Array } from "@yume-chan/struct";

import { AdbCommand } from "./packet.js";
import type { AdbDaemonSocketDispatcher } from "./socket.js";
import { AdbDaemonSocketController } from "./socket.js";

describe("AdbDaemonSocketController", () => {
    it("should close when readable stream cancels", async () => {
        const sendPacket = mock.fn<AdbDaemonSocketDispatcher["sendPacket"]>();

        const controller = new AdbDaemonSocketController({
            availableWriteBytes: 0,
            dispatcher: {
                options: {
                    maxPayloadSize: 1024,
                },
                sendPacket,
            },
            localCreated: true,
            localId: 1,
            remoteId: 2,
            service: "test",
            highWaterMark: 0,
        });

        controller.enqueue(new Uint8Array([1, 2, 3]));

        assert.strictEqual(sendPacket.mock.calls.length, 0);

        await controller.readable.cancel();

        assert.strictEqual(sendPacket.mock.calls.length, 1);
        assert.deepStrictEqual(sendPacket.mock.calls[0]?.arguments, [
            AdbCommand.Close,
            1,
            2,
            EmptyUint8Array,
        ]);
    });
});
