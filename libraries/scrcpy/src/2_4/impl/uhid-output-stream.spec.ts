import * as assert from "node:assert";
import { describe, it } from "node:test";

import { Uint8ArrayExactReadable } from "@yume-chan/struct";

import { UHidOutputStream } from "./uhid-output-stream.js";

function createMessage(id: number, data: Uint8Array) {
    const message = new Uint8Array(4 + data.byteLength);
    const view = new DataView(message.buffer);
    view.setUint16(0, id, false);
    view.setUint16(2, data.byteLength, false);
    message.set(data, 4);
    return new Uint8ArrayExactReadable(message);
}

describe("UHidOutputStream", () => {
    it("should construct", () => {
        const stream = new UHidOutputStream();
        assert.strictEqual(stream.id, 2);
    });

    it("should route output messages to the matching device", async () => {
        const stream = new UHidOutputStream();
        const device1 = stream.addDevice(1).getReader();
        const device2 = stream.addDevice(2).getReader();

        await stream.parse(0, createMessage(2, new Uint8Array([3, 4])));
        await stream.parse(0, createMessage(1, new Uint8Array([1, 2])));

        assert.deepStrictEqual(await device1.read(), {
            done: false,
            value: { id: 1, data: new Uint8Array([1, 2]) },
        });
        assert.deepStrictEqual(await device2.read(), {
            done: false,
            value: { id: 2, data: new Uint8Array([3, 4]) },
        });
    });

    it("should reject duplicate devices and messages for unknown devices", async () => {
        const stream = new UHidOutputStream();
        stream.addDevice(1);

        assert.throws(() => stream.addDevice(1), /Device ID already exists: 1/);
        await assert.rejects(
            stream.parse(0, createMessage(2, new Uint8Array())),
            /Unregistered device ID: 2/,
        );
        assert.throws(
            () => stream.deleteDevice(2),
            /Unregistered device ID: 2/,
        );
    });

    it("should close a device stream when the device is deleted", async () => {
        const stream = new UHidOutputStream();
        const device = stream.addDevice(1).getReader();

        stream.deleteDevice(1);

        assert.deepStrictEqual(await device.read(), {
            done: true,
            value: undefined,
        });
    });

    it("should close all device streams", async () => {
        const stream = new UHidOutputStream();
        const devices = [stream.addDevice(1), stream.addDevice(2)].map(
            (device) => device.getReader(),
        );

        stream.close();

        assert.deepStrictEqual(
            await Promise.all(devices.map((device) => device.read())),
            [
                { done: true, value: undefined },
                { done: true, value: undefined },
            ],
        );
    });

    it("should error all device streams", async () => {
        const stream = new UHidOutputStream();
        const devices = [stream.addDevice(1), stream.addDevice(2)].map(
            (device) => device.getReader(),
        );
        const error = new Error("failed");

        stream.error(error);

        await Promise.all(
            devices.map((device) => assert.rejects(device.read(), error)),
        );
    });
});
