import { AdbBackend, decodeBase64, encodeBase64 } from '@yume-chan/adb';
import { EventEmitter } from '@yume-chan/event';

export * from './watcher';

export const WebUsbDeviceFilter: USBDeviceFilter = {
    classCode: 0xFF,
    subclassCode: 0x42,
    protocolCode: 1,
};

const PrivateKeyStorageKey = 'private-key';

const Utf8Encoder = new TextEncoder();
const Utf8Decoder = new TextDecoder();

export function encodeUtf8(input: string): ArrayBuffer {
    return Utf8Encoder.encode(input).buffer;
}

export function decodeUtf8(buffer: ArrayBuffer): string {
    return Utf8Decoder.decode(buffer);
}

export default class AdbWebUsbBackend implements AdbBackend {
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
            switch (e.name) {
                case 'NotFoundError':
                    return undefined;
                default:
                    throw e;
            }
        }
    }

    private _device: USBDevice;

    public get serial(): string { return this._device.serialNumber!; }

    public get name(): string { return this._device.productName!; }

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
                                        return;
                                    }
                                    break;
                                case 'out':
                                    this._outEndpointNumber = endpoint.endpointNumber;
                                    if (this._inEndpointNumber !== undefined) {
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

    public *iterateKeys(): Generator<ArrayBuffer, void, void> {
        const privateKey = window.localStorage.getItem(PrivateKeyStorageKey);
        if (privateKey) {
            yield decodeBase64(privateKey);
        }
    }

    public async generateKey(): Promise<ArrayBuffer> {
        const { privateKey: cryptoKey } = await crypto.subtle.generateKey(
            {
                name: 'RSASSA-PKCS1-v1_5',
                modulusLength: 2048,
                // 65537
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: 'SHA-1',
            },
            true,
            ['sign', 'verify']
        );

        const privateKey = await crypto.subtle.exportKey('pkcs8', cryptoKey);
        window.localStorage.setItem(PrivateKeyStorageKey, decodeUtf8(encodeBase64(privateKey)));
        return privateKey;
    }

    public encodeUtf8(input: string): ArrayBuffer {
        return encodeUtf8(input);
    }

    public decodeUtf8(buffer: ArrayBuffer): string {
        return decodeUtf8(buffer);
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
        window.navigator.usb.removeEventListener('disconnect', this.handleDisconnect);
        this.disconnectEvent.dispose();
        await this._device.close();
    }
}
