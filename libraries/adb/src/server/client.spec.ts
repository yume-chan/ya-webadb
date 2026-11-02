import * as assert from "node:assert";
import { describe, it } from "node:test";
import { setImmediate } from "node:timers/promises";

import {
    AbortController,
    MaybeConsumable,
    ReadableStream,
} from "@yume-chan/stream-extra";
import { decodeUtf8, encodeUtf8 } from "@yume-chan/struct";

import { AdbServerClient } from "./client.js";

function createConnection(
    response: Uint8Array,
    requests: string[],
): AdbServerClient.ServerConnection {
    return {
        readable: new ReadableStream({
            start(controller) {
                controller.enqueue(response);
                controller.close();
            },
        }),
        writable: new MaybeConsumable.WritableStream({
            write(chunk) {
                requests.push(decodeUtf8(chunk));
            },
        }),
        closed: Promise.resolve(undefined),
        async close() {},
    };
}

describe("AdbServerClient", () => {
    it("forwards connection options through serial device selection", async () => {
        const abortController = new AbortController();
        const options: AdbServerClient.ServerConnectionOptions = {
            signal: abortController.signal,
            unref: true,
        };
        const receivedOptions: (
            AdbServerClient.ServerConnectionOptions | undefined
        )[] = [];
        const requests: string[][] = [[], []];
        const serviceResponse = new Uint8Array(16);
        serviceResponse.set(encodeUtf8("OKAY"));
        serviceResponse[4] = 42;
        serviceResponse.set(encodeUtf8("OKAY"), 12);
        const responses = [encodeUtf8("OKAY00040029"), serviceResponse];
        let connectionIndex = 0;
        const connector: AdbServerClient.ServerConnector = {
            connect(received) {
                receivedOptions.push(received);
                const response = responses[connectionIndex]!;
                const connectionRequests = requests[connectionIndex]!;
                connectionIndex += 1;
                return createConnection(response, connectionRequests);
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

        const socket = await client.createDeviceConnection(
            { serial: "serial" },
            "localabstract:service",
            options,
        );

        assert.strictEqual(socket.transportId, 42n);
        assert.strictEqual(receivedOptions.length, 2);
        for (const received of receivedOptions) {
            assert.strictEqual(received?.signal, abortController.signal);
            assert.strictEqual(received?.unref, true);
        }
        assert.deepStrictEqual(requests, [
            ["000chost:version"],
            ["0018host:tport:serial:serial", "0015localabstract:service"],
        ]);
        await socket.close();
    });

    it("forwards connection options through waitFor version preflight", async () => {
        const abortController = new AbortController();
        const options: AdbServerClient.ServerConnectionOptions = {
            signal: abortController.signal,
            unref: true,
        };
        const receivedOptions: (
            AdbServerClient.ServerConnectionOptions | undefined
        )[] = [];
        const responses = [encodeUtf8("OKAY00040029"), encodeUtf8("OKAYOKAY")];
        let connectionIndex = 0;
        const connector: AdbServerClient.ServerConnector = {
            connect(received) {
                receivedOptions.push(received);
                const response = responses[connectionIndex]!;
                connectionIndex += 1;
                return createConnection(response, []);
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

        await client.waitFor({ serial: "serial" }, "disconnect", options);

        assert.strictEqual(receivedOptions.length, 2);
        for (const received of receivedOptions) {
            assert.strictEqual(received?.signal, abortController.signal);
            assert.strictEqual(received?.unref, true);
        }
    });

    it("forwards connection options through waitForDisconnect version preflight", async () => {
        const abortController = new AbortController();
        const options: AdbServerClient.ServerConnectionOptions = {
            signal: abortController.signal,
            unref: true,
        };
        const receivedOptions: (
            AdbServerClient.ServerConnectionOptions | undefined
        )[] = [];
        const responses = [encodeUtf8("OKAY00040029"), encodeUtf8("OKAYOKAY")];
        let connectionIndex = 0;
        const connector: AdbServerClient.ServerConnector = {
            connect(received) {
                receivedOptions.push(received);
                const response = responses[connectionIndex]!;
                connectionIndex += 1;
                return createConnection(response, []);
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

        await client.waitForDisconnect(42n, options);

        assert.strictEqual(receivedOptions.length, 2);
        for (const received of receivedOptions) {
            assert.strictEqual(received?.signal, abortController.signal);
            assert.strictEqual(received?.unref, true);
        }
    });

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
