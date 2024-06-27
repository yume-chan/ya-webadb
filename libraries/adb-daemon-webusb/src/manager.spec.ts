/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
import { describe, expect, it, jest } from "@jest/globals";

import { ADB_DEFAULT_INTERFACE_FILTER, AdbDaemonWebUsbDevice } from "./device";
import { AdbDaemonWebUsbDeviceManager } from "./manager.js";

class MockUsb implements USB {
    onconnect: (ev: USBConnectionEvent) => void = jest.fn();
    ondisconnect: (ev: USBConnectionEvent) => void = jest.fn();

    getDevices: () => Promise<USBDevice[]> = jest.fn(async () => []);
    requestDevice: (options?: USBDeviceRequestOptions) => Promise<USBDevice> =
        jest.fn(async () => ({ serialNumber: "abcdefgh" }) as never);

    addEventListener(
        type: "connect" | "disconnect",
        listener: (this: this, ev: USBConnectionEvent) => void,
        useCapture?: boolean,
    ): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener(
        _type: unknown,
        _listener: unknown,
        _options?: unknown,
    ): void {
        throw new Error("Method not implemented.");
    }
    removeEventListener(
        type: "connect" | "disconnect",
        callback: (this: this, ev: USBConnectionEvent) => void,
        useCapture?: boolean,
    ): void;
    removeEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: EventListenerOptions | boolean,
    ): void;
    removeEventListener(
        _type: unknown,
        _callback: unknown,
        _options?: unknown,
    ): void {
        throw new Error("Method not implemented.");
    }
    dispatchEvent(_event: Event): boolean {
        throw new Error("Method not implemented.");
    }
}

describe("AdbDaemonWebUsbDeviceManager", () => {
    describe("requestDevice", () => {
        it("should accept 0 args", async () => {
            const usb = new MockUsb();
            const manager = new AdbDaemonWebUsbDeviceManager(usb);
            await expect(manager.requestDevice()).resolves.toBeInstanceOf(
                AdbDaemonWebUsbDevice,
            );
            expect(usb.requestDevice).toHaveBeenCalledTimes(1);
            expect(usb.requestDevice).toHaveBeenCalledWith({
                filters: [ADB_DEFAULT_INTERFACE_FILTER],
            });
        });

        it("should accept undefined filters", async () => {
            const usb = new MockUsb();
            const manager = new AdbDaemonWebUsbDeviceManager(usb);
            await expect(
                manager.requestDevice({ filters: undefined }),
            ).resolves.toBeInstanceOf(AdbDaemonWebUsbDevice);
            expect(usb.requestDevice).toHaveBeenCalledTimes(1);
            expect(usb.requestDevice).toHaveBeenCalledWith({
                filters: [ADB_DEFAULT_INTERFACE_FILTER],
            });
        });

        it("should accept empty filters array", async () => {
            const usb = new MockUsb();
            const manager = new AdbDaemonWebUsbDeviceManager(usb);
            await expect(
                manager.requestDevice({ filters: [] }),
            ).resolves.toBeInstanceOf(AdbDaemonWebUsbDevice);
            expect(usb.requestDevice).toHaveBeenCalledTimes(1);
            expect(usb.requestDevice).toHaveBeenCalledWith({
                filters: [ADB_DEFAULT_INTERFACE_FILTER],
            });
        });

        it("should accept empty filter object", async () => {
            const usb = new MockUsb();
            const manager = new AdbDaemonWebUsbDeviceManager(usb);
            await expect(
                manager.requestDevice({ filters: [{}] }),
            ).resolves.toBeInstanceOf(AdbDaemonWebUsbDevice);
            expect(usb.requestDevice).toHaveBeenCalledTimes(1);
            expect(usb.requestDevice).toHaveBeenCalledWith({
                filters: [ADB_DEFAULT_INTERFACE_FILTER],
            });
        });

        it("should merge missing fields with default values", async () => {
            const usb = new MockUsb();
            const manager = new AdbDaemonWebUsbDeviceManager(usb);
            const filter: USBDeviceFilter = { vendorId: 0x1234 };
            await expect(
                manager.requestDevice({ filters: [filter] }),
            ).resolves.toBeInstanceOf(AdbDaemonWebUsbDevice);
            expect(usb.requestDevice).toHaveBeenCalledTimes(1);
            expect(usb.requestDevice).toHaveBeenCalledWith({
                filters: [
                    {
                        ...ADB_DEFAULT_INTERFACE_FILTER,
                        ...filter,
                    },
                ],
            });
        });

        it("should merge undefined fields with default values", async () => {
            const usb = new MockUsb();
            const manager = new AdbDaemonWebUsbDeviceManager(usb);
            const filter: USBDeviceFilter = {
                classCode: undefined,
                vendorId: 0x1234,
            };
            await expect(
                manager.requestDevice({ filters: [filter] }),
            ).resolves.toBeInstanceOf(AdbDaemonWebUsbDevice);
            expect(usb.requestDevice).toHaveBeenCalledTimes(1);
            expect(usb.requestDevice).toHaveBeenCalledWith({
                filters: [
                    {
                        ...filter,
                        ...ADB_DEFAULT_INTERFACE_FILTER,
                    },
                ],
            });
        });

        it("should accept multiple filters", async () => {
            const usb = new MockUsb();
            const manager = new AdbDaemonWebUsbDeviceManager(usb);
            const filter1: USBDeviceFilter = { vendorId: 0x1234 };
            const filter2: USBDeviceFilter = { classCode: 0xaa };
            await expect(
                manager.requestDevice({ filters: [filter1, filter2] }),
            ).resolves.toBeInstanceOf(AdbDaemonWebUsbDevice);
            expect(usb.requestDevice).toHaveBeenCalledTimes(1);
            expect(usb.requestDevice).toHaveBeenCalledWith({
                filters: [
                    {
                        ...ADB_DEFAULT_INTERFACE_FILTER,
                        ...filter1,
                    },
                    {
                        ...ADB_DEFAULT_INTERFACE_FILTER,
                        ...filter2,
                    },
                ],
            });
        });
    });
});
