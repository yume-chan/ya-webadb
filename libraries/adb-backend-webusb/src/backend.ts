import { AdbBackend } from '@yume-chan/adb';
import { EventEmitter } from '@yume-chan/event';

export const WebUsbDeviceFilter: USBDeviceFilter = {
    classCode: 0xFF,
    subclassCode: 0x42,
    protocolCode: 1,
};

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

    private _connected = false;
    public get connected() { return this._connected; }

    private readonly disconnectEvent = new EventEmitter<void>();
    public readonly onDisconnected = this.disconnectEvent.event;

    private _inEndpointNumber!: number;
    private _outEndpointNumber!: number;

    public constructor(device: USBDevice) {
        this._device = device;
        window.navigator.usb.addEventListener('disconnect', this.handleDisconnect);
    }

    private handleDisconnect = (e: USBConnectionEvent) => {
        if (e.device === this._device) {
            this._connected = false;
            this.disconnectEvent.fire();
        }
    };

    public async connect(): Promise<void> {
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

                        for (const endpoint of alternate.endpoints) {
                            switch (endpoint.direction) {
                                case 'in':
                                    this._inEndpointNumber = endpoint.endpointNumber;
                                    if (this._outEndpointNumber !== undefined) {
                                        this._connected = true;
                                        return;
                                    }
                                    break;
                                case 'out':
                                    this._outEndpointNumber = endpoint.endpointNumber;
                                    if (this._inEndpointNumber !== undefined) {
                                        this._connected = true;
                                        return;
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

    public async write(buffer: ArrayBuffer): Promise<void> {
        await this._device.transferOut(this._outEndpointNumber, buffer);
    }

    public async read(length: number): Promise<ArrayBuffer> {
        const result = await this._device.transferIn(this._inEndpointNumber, length);

        if (result.status === 'stall') {
            await this._device.clearHalt('in', this._inEndpointNumber);
        }

        const { buffer } = result.data!;
        return buffer;
    }

    public async dispose() {
        this._connected = false;
        window.navigator.usb.removeEventListener('disconnect', this.handleDisconnect);
        this.disconnectEvent.dispose();
        await this._device.close();
    }
}
