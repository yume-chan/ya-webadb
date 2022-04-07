import { AdbPacket, AdbPacketSerializeStream, DuplexStreamFactory, pipeFrom, ReadableStream, type AdbBackend, type AdbPacketCore, type AdbPacketInit, type ReadableWritablePair, type WritableStream } from '@yume-chan/adb';
import type { StructAsyncDeserializeStream } from "@yume-chan/struct";

export const ADB_DEVICE_FILTER: USBDeviceFilter = {
    classCode: 0xFF,
    subclassCode: 0x42,
    protocolCode: 1,
};

export class AdbWebUsbBackendStream implements ReadableWritablePair<AdbPacketCore, AdbPacketInit>{
    private _readable: ReadableStream<AdbPacketCore>;
    public get readable() { return this._readable; }

    private _writable: WritableStream<AdbPacketInit>;
    public get writable() { return this._writable; }

    public constructor(device: USBDevice, inEndpoint: USBEndpoint, outEndpoint: USBEndpoint) {
        const factory = new DuplexStreamFactory<AdbPacketCore, Uint8Array>({
            close: async () => {
                navigator.usb.removeEventListener('disconnect', handleUsbDisconnect);
                try {
                    await device.close();
                } catch {
                    // device may already disconnected
                }
            },
        });

        function handleUsbDisconnect(e: USBConnectionEvent) {
            if (e.device === device) {
                factory.close();
            }
        }

        navigator.usb.addEventListener('disconnect', handleUsbDisconnect);

        const incomingStream: StructAsyncDeserializeStream = {
            async read(length) {
                // `ReadableStream<Uin8Array>` don't know how many bytes the consumer need in each `pull`,
                // But `transferIn(endpointNumber, packetSize)` is much slower than `transferIn(endpointNumber, length)`
                // So `AdbBackend` is refactored to use `ReadableStream<AdbPacketCore>` directly,
                // (let each backend deserialize the packets in their own way)
                const result = await device.transferIn(inEndpoint.endpointNumber, length);

                // TODO: The WebUSB spec requires `transferIn` to return `status: babble` when
                // the `length` argument is smaller than what the device actually returns.
                // But Chrome's implementation on Windows never returns `babble` because WinUSB
                // allows partial reads by default.
                // When `Struct.deserialize` calls this `read`, the `length` is each fields' length,
                // instead of packet length. So this only works on Windows.

                // From spec, the `result.data` always covers the whole `buffer`.
                return new Uint8Array(result.data!.buffer);
            }
        };

        this._readable = factory.createWrapReadable(new ReadableStream<AdbPacketCore>({
            async pull(controller) {
                const value = await AdbPacket.deserialize(incomingStream);
                controller.enqueue(value);
            },
        }));

        this._writable = pipeFrom(factory.createWritable({
            write: async (chunk) => {
                await device.transferOut(outEndpoint.endpointNumber, chunk);
            },
        }, {
            highWaterMark: 16 * 1024,
            size(chunk) { return chunk.byteLength; },
        }), new AdbPacketSerializeStream());
    }
}

export class AdbWebUsbBackend implements AdbBackend {
    public static isSupported(): boolean {
        return !!globalThis.navigator?.usb;
    }

    public static async getDevices(): Promise<AdbWebUsbBackend[]> {
        const devices = await window.navigator.usb.getDevices();
        return devices.map(device => new AdbWebUsbBackend(device));
    }

    public static async requestDevice(): Promise<AdbWebUsbBackend | undefined> {
        try {
            const device = await navigator.usb.requestDevice({ filters: [ADB_DEVICE_FILTER] });
            return new AdbWebUsbBackend(device);
        } catch (e) {
            // User cancelled the device picker
            if (e instanceof DOMException && e.name === 'NotFoundError') {
                return undefined;
            }

            throw e;
        }
    }

    private _device: USBDevice;

    public get serial(): string { return this._device.serialNumber!; }

    public get name(): string { return this._device.productName!; }

    public constructor(device: USBDevice) {
        this._device = device;
    }

    public async connect() {
        if (!this._device.opened) {
            await this._device.open();
        }

        for (const configuration of this._device.configurations) {
            for (const interface_ of configuration.interfaces) {
                for (const alternate of interface_.alternates) {
                    if (alternate.interfaceSubclass === ADB_DEVICE_FILTER.subclassCode &&
                        alternate.interfaceClass === ADB_DEVICE_FILTER.classCode &&
                        alternate.interfaceSubclass === ADB_DEVICE_FILTER.subclassCode) {
                        if (this._device.configuration?.configurationValue !== configuration.configurationValue) {
                            // Note: It's not possible to switch configuration on Windows,
                            // but Android devices should always expose ADB function at the first (default) configuration.
                            await this._device.selectConfiguration(configuration.configurationValue);
                        }

                        if (!interface_.claimed) {
                            await this._device.claimInterface(interface_.interfaceNumber);
                        }

                        if (interface_.alternate.alternateSetting !== alternate.alternateSetting) {
                            await this._device.selectAlternateInterface(interface_.interfaceNumber, alternate.alternateSetting);
                        }

                        let inEndpoint: USBEndpoint | undefined;
                        let outEndpoint: USBEndpoint | undefined;

                        for (const endpoint of alternate.endpoints) {
                            switch (endpoint.direction) {
                                case 'in':
                                    inEndpoint = endpoint;
                                    if (outEndpoint) {
                                        return new AdbWebUsbBackendStream(this._device, inEndpoint, outEndpoint);
                                    }
                                    break;
                                case 'out':
                                    outEndpoint = endpoint;
                                    if (inEndpoint) {
                                        return new AdbWebUsbBackendStream(this._device, inEndpoint, outEndpoint);
                                    }
                                    break;
                            }
                        }
                    }
                }
            }
        }

        throw new Error('Unknown error');
    }
}
