import * as assert from "node:assert";
import { describe, it } from "node:test";
import { setImmediate } from "node:timers/promises";

import type { AbortSignal } from "@yume-chan/stream-extra";

import { AdbServerClient } from "./client.js";

describe("AdbServerClient", () => {
    it("does not leak a rejected disconnect monitor promise", async () => {
        const connector: AdbServerClient.ServerConnector = {
            connect() {
                throw new Error("Not implemented");
            },
            addReverseTunnel() {
                throw new Error("Not implemented");
            },
            removeReverseTunnel() {
                throw new Error("Not implemented");
            },
            clearReverseTunnels() {
                throw new Error("Not implemented");
            },
        };
        const client = new AdbServerClient(connector);
        client.getDeviceFeatures = () =>
            Promise.resolve({
                transportId: 1n,
                features: [],
            });
        client.getDevices = () =>
            Promise.resolve([
                {
                    serial: "device",
                    state: "device",
                    authenticating: false,
                    transportId: 1n,
                },
            ]);

        let rejectDisconnect: ((reason: Error) => void) | undefined;
        let disconnectSignal: AbortSignal | undefined;
        client.waitForDisconnect = (_transportId, options) =>
            new Promise((_, reject) => {
                disconnectSignal = options?.signal;
                rejectDisconnect = reject;
            });

        const transport = await client.createTransport({ serial: "device" });
        assert.ok(rejectDisconnect);
        const handledDisconnect = assert.rejects(
            transport.disconnected,
            /disconnect failed/,
        );

        rejectDisconnect(new Error("disconnect failed"));
        await handledDisconnect;
        // Give Node.js a turn to report any cleanup-derived rejection.
        await setImmediate();

        assert.strictEqual(disconnectSignal?.aborted, true);
    });
});
