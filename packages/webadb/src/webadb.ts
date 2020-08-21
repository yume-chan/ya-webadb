import AsyncOperationManager from '@yume-chan/async-operation-manager';
import toBase64 from './base64';
import { AdbPacket } from './packet';
import { AdbStream } from './stream';
import { WebUsbTransportation } from './transportation';

export const AdbDeviceFilter: USBDeviceFilter = { classCode: 0xFF, subclassCode: 0x42, protocolCode: 1 };

export class WebAdb {
    private _transportation: WebUsbTransportation;

    public get name() { return this._transportation.name; }

    private _alive = true;
    private _looping = false;

    // ADB requires stream id to start from 1
    // (0 means open failed)
    private _streamInitializer = new AsyncOperationManager(1);
    private _streams = new Map<number, AdbStream>();

    public constructor(transportation: WebUsbTransportation) {
        this._transportation = transportation;
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
                    this._transportation.dispose();
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
                        this._transportation.dispose();
                        throw new Error('version mismatch');
                    }
                    return;
                case 'AUTH':
                    if (response.arg0 !== 1) {
                        this._transportation.dispose();
                        throw new Error('unknown auth type');
                    }
                    const key = await this.generateKey();
                    const publicKey = await crypto.subtle.exportKey('spki', key.publicKey);
                    await this.sendMessage('AUTH', 3, 0, toBase64(publicKey));
                    break;
                default:
                    this._transportation.dispose();
                    throw new Error('Device not in correct state. Reconnect your device and try again');
            }
        }
    }

    public async shell(command: string, ...args: string[]): Promise<string>;
    public async shell(): Promise<AdbStream>;
    public async shell(command?: string, ...args: string[]): Promise<AdbStream | string> {
        if (!command) {
            return this.createStream('shell:');
        } else {
            return this.createStreamAndWait(`shell:${command} ${args.join(' ')}`);
        }
    }

    public async tcpip(port = 5555): Promise<string> {
        return this.createStreamAndWait(`tcpip:${port}`);
    }

    public async usb(): Promise<string> {
        return this.createStreamAndWait('usb:');
    }

    public async sendMessage(command: string, arg0: number, arg1: number, payload?: string | ArrayBuffer): Promise<void> {
        const packet = new AdbPacket(command, arg0, arg1, payload);
        console.log('send', command, arg0, arg1, payload);
        await this._transportation.write(packet.toBuffer());
        if (packet.payloadLength !== 0) {
            await this._transportation.write(packet.payload!);
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

    public async createStreamAndWait(command: string): Promise<string> {
        const stream = await this.createStream(command);
        return new Promise<string>((resolve) => {
            let output = '';
            const decoder = new TextDecoder();
            stream.onData((data) => {
                output += decoder.decode(data);
            });
            stream.onClose(() => {
                resolve(output);
            });
        });
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

    private async receiveData(length: number): Promise<ArrayBuffer> {
        return await this._transportation.read(length);
    }

    private async generateKey() {
        return await crypto.subtle.generateKey({
            name: 'RSASSA-PKCS1-v1_5',
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: { name: 'SHA-1' },
        }, false, ['sign', 'verify']);
    }

    public async dispose() {
        for (const [localId, stream] of this._streams) {
            await stream.close();
        }
        await this._transportation.dispose();
    }
}
