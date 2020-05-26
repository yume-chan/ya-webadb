import { AdbPacket } from './packet';
import { AdbStream } from './stream';
import AsyncOperationManager from '@yume-chan/async-operation-manager';

export const AdbDeviceFilter: USBDeviceFilter = { classCode: 0xFF, subclassCode: 0x42, protocolCode: 1 };

export class WebAdb {
    public static async open() {
        const device = await navigator.usb.requestDevice({ filters: [AdbDeviceFilter] });
        await device.open();

        const webadb = new WebAdb(device);
        await webadb.initialize();
        return webadb;
    }

    private _device: USBDevice;

    private _inEndpointNumber!: number;
    private _outEndpointNumber!: number;

    private _alive = true;
    private _looping = false;

    // ADB requires stream id to start from 1
    // (0 means open failed)
    private _streamInitializer = new AsyncOperationManager(1);
    private _streams = new Map<number, AdbStream>();

    public constructor(device: USBDevice) {
        this._device = device;
    }

    private async initialize(): Promise<void> {
        for (const configuration of this._device.configurations) {
            for (const interface_ of configuration.interfaces) {
                for (const alternate of interface_.alternates) {
                    if (alternate.interfaceProtocol === AdbDeviceFilter.protocolCode &&
                        alternate.interfaceClass === AdbDeviceFilter.classCode &&
                        alternate.interfaceSubclass === AdbDeviceFilter.subclassCode) {
                        if (this._device.configuration?.configurationValue !== configuration.configurationValue) {
                            await this._device.selectConfiguration(configuration.configurationValue);
                        }

                        if (!interface_.claimed) {
                            await this._device.claimInterface(interface_.interfaceNumber);
                        }

                        if (interface_.alternate.alternateSetting !== alternate.alternateSetting) {
                            await this._device.selectAlternateInterface(interface_.interfaceNumber, alternate.alternateSetting);
                        }

                        this._inEndpointNumber = this.getEndpointNumber(alternate.endpoints, 'in');
                        this._outEndpointNumber = this.getEndpointNumber(alternate.endpoints, 'out');
                        return;
                    }
                }
            }
        }
    }

    private async receiveLoop(): Promise<void> {
        if (this._looping) {
            return;
        }

        this._looping = true;

        while (this._alive) {
            const response = await this.receiveMessage();
            switch (response.command) {
                case 'OKAY':
                    // OKAY has two meanings
                    // 1. The device has created the Stream
                    this._streamInitializer.resolve(response.arg1, response.arg0);
                    // 2. The device has received last WRTE to the Stream
                    this._streams.get(response.arg1)?.ack();
                    break;
                case 'CLSE':
                    // CLSE also has two meanings
                    if (response.arg0 === 0) {
                        // 1. The device don't want to create the Stream
                        this._streamInitializer.reject(response.arg1, new Error('open failed'));
                    } else {
                        // 2. The device has closed the Stream
                        this._streams.get(response.arg1)?.onCloseEvent.fire();
                        this._streams.delete(response.arg1);
                    }
                    break;
                case 'WRTE':
                    this._streams.get(response.arg1)?.onDataEvent.fire(response.payload!);
                    await this.sendMessage('OKAY', response.arg1, response.arg0);
                    break;
                default:
                    this._device.close();
                    throw new Error('unknown command');
            }
        }
    }

    public async connect() {
        const version = 0x01000001;

        await this.sendMessage('CNXN', version, 256 * 1024, 'host::');

        while (true) {
            const response = await this.receiveMessage();
            switch (response.command) {
                case 'CNXN':
                    if (response.arg0 !== version) {
                        this._device.close();
                        throw new Error('version mismatch');
                    }
                    return;
                case 'AUTH':
                    if (response.arg0 !== 1) {
                        this._device.close();
                        throw new Error('unknwon auth type');
                    }
                    const key = await this.generateKey();
                    const publicKey = await crypto.subtle.exportKey('spki', key.publicKey);
                    await this.sendMessage('AUTH', 3, 0, this.toBase64(publicKey));
                    break;
                default:
                    this._device.close();
                    throw new Error('unknown command');
            }
        }
    }

    public async shell(command: string, ...args: string[]): Promise<string>;
    public async shell(): Promise<AdbStream>;
    public async shell(command?: string, ...args: string[]): Promise<AdbStream | string> {
        if (!command) {
            return this.createStream('shell:');
        } else {
            const stream = await this.createStream(`shell,v2,raw:${command} ${args.join(' ')}`);
            return new Promise<string>((resolve) => {
                let output = '';
                const decoder = new TextDecoder();
                stream.onData((data) => {
                    output += decoder.decode(data);
                });
                stream.onClose(() => {
                    resolve(output);
                });
            })
        }
    }

    public async sendMessage(command: string, arg0: number, arg1: number, payload?: string | ArrayBuffer): Promise<void> {
        const packet = new AdbPacket(command, arg0, arg1, payload);
        console.log('send', command, arg0, arg1, payload);
        await this._device.transferOut(this._outEndpointNumber, packet.toBuffer());
        if (packet.payloadLength !== 0) {
            await this._device.transferOut(this._outEndpointNumber, packet.payload!);
        }
    }

    public async createStream(command: string): Promise<AdbStream> {
        const { id: localId, promise: initializer } = this._streamInitializer.add<number>();
        await this.sendMessage('OPEN', localId, 0, command);
        this.receiveLoop();

        const remoteId = await initializer;
        const stream = new AdbStream(this, localId, remoteId);
        this._streams.set(localId, stream);
        return stream;
    }

    public async receiveMessage() {
        console.log('receiving');

        const header = await this.receiveData(24);
        const packet = AdbPacket.parse(header);

        if (packet.payloadLength !== 0) {
            packet.payload = await this.receiveData(packet.payloadLength);
        }

        console.log('receive', packet.command, packet.arg0, packet.arg1, packet.payload);
        return packet;
    }

    private getEndpointNumber(endpoints: USBEndpoint[], direction: USBDirection, type: USBEndpointType = 'bulk') {
        for (const endpoint of endpoints) {
            if (endpoint.direction === direction &&
                endpoint.type === type) {
                return endpoint.endpointNumber;
            }
        }

        throw new Error('Cannot find endpoint');
    }

    private async receiveData(length: number): Promise<ArrayBuffer> {
        const result = await this._device.transferIn(this._inEndpointNumber, length);
        if (result.status === 'stall') {
            console.log('clear halt in');
            await this._device.clearHalt('in', this._inEndpointNumber);
        }
        return result.data!.buffer;
    }

    private async generateKey() {
        return await crypto.subtle.generateKey({
            name: 'RSASSA-PKCS1-v1_5',
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: { name: 'SHA-1' },
        }, false, ['sign', 'verify']);
    }

    private toBase64(arraybuffer: ArrayBuffer) {
        let characterSet = [];
        const pairs = [
            ['A', 'Z'],
            ['a', 'z'],
            ['0', '9'],
        ].map(pair => pair.map(character => character.charCodeAt(0)));

        for (const [begin, end] of pairs) {
            for (let i = begin; i <= end; i += 1) {
                characterSet.push(String.fromCharCode(i));
            }
        }
        characterSet.push('+', '/');

        const array = new Uint8Array(arraybuffer);
        const length = arraybuffer.byteLength;
        const remainder = length % 3;
        let result = '';

        for (let i = 0; i < length - remainder; i += 3) {
            // aaaaaabb
            const x = array[i];
            // bbbbcccc
            const y = array[i + 1];
            // ccdddddd
            const z = array[i + 2];

            const a = x >> 2;
            const b = ((x & 0b11) << 4) | (y >> 4);
            const c = ((y & 0b1111) << 2) | (z >> 6);
            const d = z & 0b111111;

            result += characterSet[a] + characterSet[b] + characterSet[c] + characterSet[d];
        }

        if (remainder === 1) {
            // aaaaaabb
            const x = array[length - 1];

            const a = x >> 2;
            const b = ((x & 0b11) << 4);

            result += characterSet[a] + characterSet[b] + '==';
        } else if (remainder === 2) {
            // aaaaaabb
            const x = array[length - 2];
            // bbbbcccc
            const y = array[length - 1];

            const a = x >> 2;
            const b = ((x & 0b11) << 4) | (y >> 4);
            const c = ((y & 0b1111) << 2);

            result = characterSet[a] + characterSet[b] + characterSet[c] + '=';
        }

        return result;
    }
}
