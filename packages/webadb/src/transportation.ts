export interface WebAdbTransportation {
    readonly name: string | undefined;

    write(buffer: ArrayBuffer): void | Promise<void>;

    read(length: number): ArrayBuffer | Promise<ArrayBuffer>;

    dispose(): void | Promise<void>;
}

export const WebUsbDeviceFilter: USBDeviceFilter = {
    classCode: 0xFF,
    subclassCode: 0x42,
    protocolCode: 1,
};

export class WebUsbTransportation implements WebAdbTransportation {
    public static async fromDevice(device: USBDevice) {
        await device.open();

        try {
            await device.reset();
        } catch (e) {
            // ignore
        }

        for (const configuration of device.configurations) {
            for (const interface_ of configuration.interfaces) {
                for (const alternate of interface_.alternates) {
                    if (alternate.interfaceSubclass === WebUsbDeviceFilter.subclassCode &&
                        alternate.interfaceClass === WebUsbDeviceFilter.classCode &&
                        alternate.interfaceSubclass === WebUsbDeviceFilter.subclassCode) {
                        if (device.configuration?.configurationValue !== configuration.configurationValue) {
                            await device.selectConfiguration(configuration.configurationValue);
                        }

                        if (!interface_.claimed) {
                            await device.claimInterface(interface_.interfaceNumber);
                        }

                        if (interface_.alternate.alternateSetting !== alternate.alternateSetting) {
                            await device.selectAlternateInterface(interface_.interfaceNumber, alternate.alternateSetting);
                        }

                        let inEndpointNumber: number | undefined;
                        let outEndpointNumber: number | undefined;

                        for (const endpoint of alternate.endpoints) {
                            switch (endpoint.direction) {
                                case 'in':
                                    inEndpointNumber = endpoint.endpointNumber;
                                    if (outEndpointNumber !== undefined) {
                                        return new WebUsbTransportation(device, inEndpointNumber, outEndpointNumber);
                                    }
                                    break;
                                case 'out':
                                    outEndpointNumber = endpoint.endpointNumber;
                                    if (inEndpointNumber !== undefined) {
                                        return new WebUsbTransportation(device, inEndpointNumber, outEndpointNumber);
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

    public static async pickDevice() {
        try {
            const device = await navigator.usb.requestDevice({ filters: [WebUsbDeviceFilter] });
            return WebUsbTransportation.fromDevice(device);
        } catch (e) {
            switch (e.name) {
                case 'NotFoundError':
                    return undefined;
                default:
                    throw e;
            }
        }
    }

    private _device: USBDevice;

    public get name() { return this._device.productName; }

    private _inEndpointNumber!: number;
    private _outEndpointNumber!: number;

    private constructor(device: USBDevice, inEndPointNumber: number, outEndPointNumber: number) {
        this._device = device;
        this._inEndpointNumber = inEndPointNumber;
        this._outEndpointNumber = outEndPointNumber;
    }

    public async write(buffer: ArrayBuffer): Promise<void> {
        await this._device.transferOut(this._outEndpointNumber, buffer);
    }

    public async read(length: number): Promise<ArrayBuffer> {
        const result = await this._device.transferIn(this._inEndpointNumber, length);

        if (result.status === 'stall') {
            await this._device.clearHalt('in', this._inEndpointNumber);
        }

        return result.data!.buffer;
    }

    public async dispose() {
        await this._device.close();
    }
}
