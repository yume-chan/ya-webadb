import { AdbBackend, ReadableStream } from '@yume-chan/adb';
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

    private _readable: ReadableStream<ArrayBuffer> | undefined;
    public get readable() { return this._readable; }

    private _writable: WritableStream<ArrayBuffer> | undefined;
    public get writable() { return this._writable; }

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
                                    this._readable = new ReadableStream({
                                        pull: async (controller) => {
                                            let result = await this._device.transferIn(endpoint.endpointNumber, endpoint.packetSize);

                                            if (result.status === 'stall') {
                                                // https://android.googlesource.com/platform/packages/modules/adb/+/79010dc6d5ca7490c493df800d4421730f5466ca/client/usb_osx.cpp#543
                                                await this._device.clearHalt('in', endpoint.endpointNumber);
                                                result = await this._device.transferIn(endpoint.endpointNumber, endpoint.packetSize);
                                            }

                                            const { buffer } = result.data!;
                                            controller.enqueue(buffer);
                                        },
                                        cancel: () => {
                                            this.dispose();
                                        },
                                    }, {
                                        highWaterMark: 16 * 1024,
                                        size(chunk) { return chunk.byteLength; },
                                    });
                                    if (this._writable !== undefined) {
                                        this._connected = true;
                                        return;
                                    }
                                    break;
                                case 'out':
                                    this._writable = new WritableStream({
                                        write: async (chunk) => {
                                            await this._device.transferOut(endpoint.endpointNumber, chunk);
                                        },
                                        close: () => {
                                            this.dispose();
                                        },
                                    }, {
                                        highWaterMark: 16 * 1024,
                                        size(chunk) { return chunk.byteLength; },
                                    });
                                    if (this.readable !== undefined) {
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

    public async dispose() {
        this._connected = false;
        window.navigator.usb.removeEventListener('disconnect', this.handleDisconnect);
        this.disconnectEvent.dispose();
        await this._device.close();
    }
}
