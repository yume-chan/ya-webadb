import { AdbBackend, ReadableStream, ReadableWritablePair } from '@yume-chan/adb';

export const WebUsbDeviceFilter: USBDeviceFilter = {
    classCode: 0xFF,
    subclassCode: 0x42,
    protocolCode: 1,
};

export class AdbWebUsbBackendStream implements ReadableWritablePair<ArrayBuffer, ArrayBuffer>{
    private _readable: ReadableStream<ArrayBuffer>;
    public get readable() { return this._readable; }

    private _writable: WritableStream<ArrayBuffer>;
    public get writable() { return this._writable; }

    public constructor(device: USBDevice, inEndpoint: USBEndpoint, outEndpoint: USBEndpoint) {
        this._readable = new ReadableStream({
            pull: async (controller) => {
                let result = await device.transferIn(inEndpoint.endpointNumber, inEndpoint.packetSize);

                if (result.status === 'stall') {
                    // https://android.googlesource.com/platform/packages/modules/adb/+/79010dc6d5ca7490c493df800d4421730f5466ca/client/usb_osx.cpp#543
                    await device.clearHalt('in', inEndpoint.endpointNumber);
                    result = await device.transferIn(inEndpoint.endpointNumber, inEndpoint.packetSize);
                }

                const { buffer } = result.data!;
                controller.enqueue(buffer);
            },
            cancel: async () => {
                await device.close();
            },
        }, {
            highWaterMark: 16 * 1024,
            size(chunk) { return chunk.byteLength; },
        });

        this._writable = new WritableStream({
            write: async (chunk) => {
                await device.transferOut(outEndpoint.endpointNumber, chunk);
            },
            close: async () => {
                await device.close();
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
