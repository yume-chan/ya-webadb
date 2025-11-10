/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
import * as assert from "node:assert";
import { describe, it, mock } from "node:test";

import { AdbDaemonWebUsbDevice, AdbDefaultInterfaceFilter } from "./device.js";
import { AdbDaemonWebUsbDeviceManager } from "./manager.js";

Object.assign(globalThis, {
    USBConnectionEvent: class USBConnectionEvent extends Event {
        device: USBDevice;
        constructor(type: string, init: USBConnectionEventInit) {
            super(type, init);
            this.device = init.device;
        }
    },
});

class MockUsb implements USB {
    onconnect: (ev: USBConnectionEvent) => void = mock.fn();
    ondisconnect: (ev: USBConnectionEvent) => void = mock.fn();

    getDevices = mock.fn(async () => []);
    requestDevice = mock.fn(
        async (options?: USBDeviceRequestOptions) =>
            ({
                serialNumber: options?.filters?.[0]?.serialNumber ?? "abcdefgh",
                vendorId: options?.filters?.[0]?.vendorId ?? 0x18d1,
                productId: options?.filters?.[0]?.productId ?? 0x4e49,
                configuration: null,
                configurations: [
                    {
                        configurationName: null,
                        configurationValue: 1,
                        interfaces: [
                            {
                                interfaceNumber: 0,
                                claimed: false,
                                alternate: {
                                    alternateSetting: 0,
                                    interfaceClass:
                                        AdbDefaultInterfaceFilter.classCode,
                                    interfaceSubclass:
                                        AdbDefaultInterfaceFilter.subclassCode,
                                    interfaceName: null,
                                    interfaceProtocol:
                                        AdbDefaultInterfaceFilter.protocolCode,
                                    endpoints: [],
                                },
                                alternates: [
                                    {
                                        alternateSetting: 0,
                                        interfaceClass:
                                            AdbDefaultInterfaceFilter.classCode,
                                        interfaceSubclass:
                                            AdbDefaultInterfaceFilter.subclassCode,
                                        interfaceName: null,
                                        interfaceProtocol:
                                            AdbDefaultInterfaceFilter.protocolCode,
                                        endpoints: [],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            }) satisfies Partial<USBDevice> as never,
    );

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
        return true;
    }
}

describe("AdbDaemonWebUsbDeviceManager", () => {
    describe("requestDevice", () => {
        it("should accept 0 args", async () => {
            const usb = new MockUsb();
            const manager = new AdbDaemonWebUsbDeviceManager(usb);
            assert.ok(
                (await manager.requestDevice()) instanceof
                    AdbDaemonWebUsbDevice,
            );
            assert.strictEqual(usb.requestDevice.mock.callCount(), 1);
            assert.deepEqual(usb.requestDevice.mock.calls[0]?.arguments, [
                {
                    filters: [AdbDefaultInterfaceFilter],
                    exclusionFilters: undefined,
                },
            ]);
        });

        it("should accept undefined filters", async () => {
            const usb = new MockUsb();
            const manager = new AdbDaemonWebUsbDeviceManager(usb);
            assert.ok(
                (await manager.requestDevice({ filters: undefined })) instanceof
                    AdbDaemonWebUsbDevice,
            );
            assert.strictEqual(usb.requestDevice.mock.callCount(), 1);
            assert.deepEqual(usb.requestDevice.mock.calls[0]?.arguments, [
                {
                    filters: [AdbDefaultInterfaceFilter],
                    exclusionFilters: undefined,
                },
            ]);
        });

        it("should accept empty filters array", async () => {
            const usb = new MockUsb();
            const manager = new AdbDaemonWebUsbDeviceManager(usb);
            assert.ok(
                (await manager.requestDevice({ filters: [] })) instanceof
                    AdbDaemonWebUsbDevice,
            );
            assert.strictEqual(usb.requestDevice.mock.callCount(), 1);
            assert.deepEqual(usb.requestDevice.mock.calls[0]?.arguments, [
                {
                    filters: [AdbDefaultInterfaceFilter],
                    exclusionFilters: undefined,
                },
            ]);
        });

        it("should accept empty filter object", async () => {
            const usb = new MockUsb();
            const manager = new AdbDaemonWebUsbDeviceManager(usb);
            assert.ok(
                (await manager.requestDevice({ filters: [{}] })) instanceof
                    AdbDaemonWebUsbDevice,
            );
            assert.strictEqual(usb.requestDevice.mock.callCount(), 1);
            assert.deepEqual(usb.requestDevice.mock.calls[0]?.arguments, [
                {
                    filters: [AdbDefaultInterfaceFilter],
                    exclusionFilters: undefined,
                },
            ]);
        });

        it("should merge missing fields with default values", async () => {
            const usb = new MockUsb();
            const manager = new AdbDaemonWebUsbDeviceManager(usb);
            const filter: USBDeviceFilter = { vendorId: 0x1234 };
            assert.ok(
                (await manager.requestDevice({ filters: [filter] })) instanceof
                    AdbDaemonWebUsbDevice,
            );
            assert.strictEqual(usb.requestDevice.mock.callCount(), 1);
            assert.deepEqual(usb.requestDevice.mock.calls[0]?.arguments, [
                {
                    filters: [
                        {
                            ...AdbDefaultInterfaceFilter,
                            ...filter,
                        },
                    ],
                    exclusionFilters: undefined,
                },
            ]);
        });

        it("should merge undefined fields with default values", async () => {
            const usb = new MockUsb();
            const manager = new AdbDaemonWebUsbDeviceManager(usb);
            const filter: USBDeviceFilter = {
                classCode: undefined,
                vendorId: 0x1234,
            };
            assert.ok(
                (await manager.requestDevice({ filters: [filter] })) instanceof
                    AdbDaemonWebUsbDevice,
            );
            assert.strictEqual(usb.requestDevice.mock.callCount(), 1);
            assert.deepEqual(usb.requestDevice.mock.calls[0]?.arguments, [
                {
                    filters: [
                        {
                            ...filter,
                            ...AdbDefaultInterfaceFilter,
                        },
                    ],
                    exclusionFilters: undefined,
                },
            ]);
        });

        it("should accept multiple filters", async () => {
            const usb = new MockUsb();
            const manager = new AdbDaemonWebUsbDeviceManager(usb);
            const filter1: USBDeviceFilter = { vendorId: 0x1234 };
            const filter2: USBDeviceFilter = { classCode: 0xaa };
            assert.ok(
                (await manager.requestDevice({
                    filters: [filter1, filter2],
                })) instanceof AdbDaemonWebUsbDevice,
            );
            assert.strictEqual(usb.requestDevice.mock.callCount(), 1);
            assert.deepEqual(usb.requestDevice.mock.calls[0]?.arguments, [
                {
                    filters: [
                        {
                            ...AdbDefaultInterfaceFilter,
                            ...filter1,
                        },
                        {
                            ...AdbDefaultInterfaceFilter,
                            ...filter2,
                        },
                    ],
                    exclusionFilters: undefined,
                },
            ]);
        });
    });
});
