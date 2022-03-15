import { DuplexStreamFactory, type AdbBackend, type ReadableStream, type ReadableWritablePair } from '@yume-chan/adb';

export const WebUsbDeviceFilter: USBDeviceFilter = {
    classCode: 0xFF,
    subclassCode: 0x42,
    protocolCode: 1,
};

export class AdbWebUsbBackendStream implements ReadableWritablePair<Uint8Array, Uint8Array>{
    private _readable: ReadableStream<Uint8Array>;
    public get readable() { return this._readable; }

    private _writable: WritableStream<Uint8Array>;
    public get writable() { return this._writable; }

    public constructor(device: USBDevice, inEndpoint: USBEndpoint, outEndpoint: USBEndpoint) {
        const factory = new DuplexStreamFactory<Uint8Array, Uint8Array>({
            close: async () => {
                navigator.usb.removeEventListener('disconnect', handleUsbDisconnect);
                await device.close();
            },
        });

        function handleUsbDisconnect(e: USBConnectionEvent) {
            if (e.device === device) {
                factory.close();
            }
        }

        navigator.usb.addEventListener('disconnect', handleUsbDisconnect);

        this._readable = factory.createReadable({
            pull: async (controller) => {
                const result = await device.transferIn(inEndpoint.endpointNumber, inEndpoint.packetSize);
                // `USBTransferResult` has three states: "ok", "stall" and "babble",
                // adbd on Android won't enter the "stall" (halt) state,
                // "ok" and "babble" both have received `data`,
                // "babble" just means there is more data to be read.
                // From spec, the `result.data` always covers the whole `buffer`.
                const chunk = new Uint8Array(result.data!.buffer);
                controller.enqueue(chunk);
            },
        }, {
            highWaterMark: 16 * 1024,
            size(chunk) { return chunk.byteLength; },
        });

        this._writable = factory.createWritable({
            write: async (chunk) => {
                await device.transferOut(outEndpoint.endpointNumber, chunk);
            },
        }, {
            highWaterMark: 16 * 1024,
            size(chunk) { return chunk.byteLength; },
        });
    }
}

export class AdbWebUsbBackend implements AdbBackend {
    public static isSupported(): boolean {
        return !!window.navigator?.usb;
    }

    public static async getDevices(): Promise<AdbWebUsbBackend[]> {
        const devices = await window.navigator.usb.getDevices();
        return devices.map(device => new AdbWebUsbBackend(device));
    }

    public static async requestDevice(): Promise<AdbWebUsbBackend | undefined> {
        try {
            const device = await navigator.usb.requestDevice({ filters: [WebUsbDeviceFilter] });
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
                    if (alternate.interfaceSubclass === WebUsbDeviceFilter.subclassCode &&
                        alternate.interfaceClass === WebUsbDeviceFilter.classCode &&
                        alternate.interfaceSubclass === WebUsbDeviceFilter.subclassCode) {
                        if (this._device.configuration?.configurationValue !== configuration.configurationValue) {
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
