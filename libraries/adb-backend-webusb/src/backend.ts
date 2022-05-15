import { AdbPacketHeader, AdbPacketSerializeStream, DuplexStreamFactory, pipeFrom, ReadableStream, WritableStream, type AdbBackend, type AdbPacketData, type AdbPacketInit, type ReadableWritablePair } from '@yume-chan/adb';
import { EMPTY_UINT8_ARRAY, StructDeserializeStream } from "@yume-chan/struct";

export const ADB_DEVICE_FILTER: USBDeviceFilter = {
    classCode: 0xFF,
    subclassCode: 0x42,
    protocolCode: 1,
};

class Uint8ArrayStructDeserializeStream implements StructDeserializeStream {
    private buffer: Uint8Array;

    private offset: number;

    public constructor(buffer: Uint8Array) {
        this.buffer = buffer;
        this.offset = 0;
    }

    public read(length: number): Uint8Array {
        const result = this.buffer.subarray(this.offset, this.offset + length);
        this.offset += length;
        return result;
    }
}

export class AdbWebUsbBackendStream implements ReadableWritablePair<AdbPacketData, AdbPacketInit>{
    private _readable: ReadableStream<AdbPacketData>;
    public get readable() { return this._readable; }

    private _writable: WritableStream<AdbPacketInit>;
    public get writable() { return this._writable; }

    public constructor(device: USBDevice, inEndpoint: USBEndpoint, outEndpoint: USBEndpoint) {
        const factory = new DuplexStreamFactory<AdbPacketData, Uint8Array>({
            close: async () => {
                try { await device.close(); } catch { /* device may have already disconnected */ }
            },
            dispose: async () => {
                navigator.usb.removeEventListener('disconnect', handleUsbDisconnect);
            },
        });

        function handleUsbDisconnect(e: USBConnectionEvent) {
            if (e.device === device) {
                factory.dispose();
            }
        }

        navigator.usb.addEventListener('disconnect', handleUsbDisconnect);

        this._readable = factory.wrapReadable(new ReadableStream<AdbPacketData>({
            async pull(controller) {
                // The `length` argument in `transferIn` must not be smaller than what the device sent,
                // otherwise it will return `babble` status without any data.
                // Here we read exactly 24 bytes (packet header) followed by exactly `payloadLength`.
                const result = await device.transferIn(inEndpoint.endpointNumber, 24);

                // TODO: webusb: handle `babble` by discarding the data and receive again
                // TODO: webusb: on Windows, `transferIn` throws an NetworkError when device disconnected, check with other OSs.

                // From spec, the `result.data` always covers the whole `buffer`.
                const buffer = new Uint8Array(result.data!.buffer);
                const stream = new Uint8ArrayStructDeserializeStream(buffer);

                // Add `payload` field to its type, because we will assign `payload` in next step.
                const packet = AdbPacketHeader.deserialize(stream) as AdbPacketHeader & { payload: Uint8Array; };
                if (packet.payloadLength !== 0) {
                    const result = await device.transferIn(inEndpoint.endpointNumber, packet.payloadLength);
                    packet.payload = new Uint8Array(result.data!.buffer);
                } else {
                    packet.payload = EMPTY_UINT8_ARRAY;
                }

                controller.enqueue(packet);
            },
        }));

        this._writable = pipeFrom(
            factory.createWritable(new WritableStream({
                write: async (chunk) => {
                    await device.transferOut(outEndpoint.endpointNumber, chunk);
                },
            }, {
                highWaterMark: 16 * 1024,
                size(chunk) { return chunk.byteLength; },
            })),
            new AdbPacketSerializeStream()
        );
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
                            // Note: Switching configuration is not supported on Windows,
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
