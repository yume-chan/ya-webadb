import { AdbBackend, decodeBase64, encodeBase64 } from '@yume-chan/adb';
import { EventEmitter } from '@yume-chan/event';

export const WebUsbDeviceFilter: USBDeviceFilter = {
    classCode: 0xFF,
    subclassCode: 0x42,
    protocolCode: 1,
};

const PrivateKeyStorageKey = 'private-key';

const Utf8Encoder = new TextEncoder();
const Utf8Decoder = new TextDecoder();

export class WebUsbAdbBackend implements AdbBackend {
    public static async fromDevice(device: USBDevice) {
        await device.open();

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
                                        return new WebUsbAdbBackend(device, inEndpointNumber, outEndpointNumber);
                                    }
                                    break;
                                case 'out':
                                    outEndpointNumber = endpoint.endpointNumber;
                                    if (inEndpointNumber !== undefined) {
                                        return new WebUsbAdbBackend(device, inEndpointNumber, outEndpointNumber);
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
            return WebUsbAdbBackend.fromDevice(device);
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

    private readonly onDisconnectedEvent = new EventEmitter<void>();
    public readonly onDisconnected = this.onDisconnectedEvent.event;

    private _inEndpointNumber!: number;
    private _outEndpointNumber!: number;

    private constructor(device: USBDevice, inEndPointNumber: number, outEndPointNumber: number) {
        this._device = device;
        this._inEndpointNumber = inEndPointNumber;
        this._outEndpointNumber = outEndPointNumber;
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
        window.localStorage.setItem(PrivateKeyStorageKey, encodeBase64(privateKey));
        return privateKey;
    }

    public encodeUtf8(input: string): ArrayBuffer {
        return Utf8Encoder.encode(input);
    }

    public decodeUtf8(buffer: ArrayBuffer): string {
        return Utf8Decoder.decode(buffer);
    }

    public async write(buffer: ArrayBuffer): Promise<void> {
        await this._device.transferOut(this._outEndpointNumber, buffer);
    }

    public async read(length: number): Promise<ArrayBuffer> {
        try {
            const result = await this._device.transferIn(this._inEndpointNumber, length);

            if (result.status === 'stall') {
                await this._device.clearHalt('in', this._inEndpointNumber);
            }

            return result.data!.buffer;
        } catch (e) {
            if (e instanceof Error && e.name === 'NotFoundError') {
                this.onDisconnectedEvent.fire();
            }

            throw e;
        }
    }

    public async dispose() {
        this.onDisconnectedEvent.dispose();
        await this._device.close();
    }
}
