import { AutoDisposable } from '@yume-chan/event';
import Struct from '@yume-chan/struct';
import { AdbPacket } from '../packet';
import { AdbIncomingSocketEventArgs, AdbPacketDispatcher, AdbSocket } from '../socket';
import { AdbBufferedStream } from '../stream';

export interface AdbReverseHandler {
    onSocket(packet: AdbPacket, socket: AdbSocket): void;
}

export interface AdbForwardListener {
    deviceSerial: string;

    localName: string;

    remoteName: string;
}

const AdbReverseStringResponse =
    new Struct({ littleEndian: true })
        .string('length', { length: 4 })
        .string('content', { lengthField: 'length' });

const AdbReverseErrorResponse =
    new Struct({ littleEndian: true })
        .fields(AdbReverseStringResponse)
        .postDeserialize((value) => {
            throw new Error(value.content);
        });

export class AdbReverseCommand extends AutoDisposable {
    protected localPortToHandler = new Map<number, AdbReverseHandler>();

    protected deviceAddressToLocalPort = new Map<string, number>();

    protected dispatcher: AdbPacketDispatcher;

    protected listening = false;

    public constructor(dispatcher: AdbPacketDispatcher) {
        super();

        this.dispatcher = dispatcher;
        this.addDisposable(this.dispatcher.onIncomingSocket(this.handleIncomingSocket, this));
    }

    protected handleIncomingSocket(e: AdbIncomingSocketEventArgs): void {
        if (e.handled) {
            return;
        }

        const address = this.dispatcher.backend.decodeUtf8(e.packet.payload!);
        // tcp:1234\0
        const port = Number.parseInt(address.substring(4));
        if (this.localPortToHandler.has(port)) {
            this.localPortToHandler.get(port)!.onSocket(e.packet, e.socket);
            e.handled = true;
        }
    }

    private async createBufferedStream(service: string) {
        const socket = await this.dispatcher.createSocket(service);
        return new AdbBufferedStream(socket);
    }

    private async sendRequest(service: string) {
        const stream = await this.createBufferedStream(service);
        const success = this.dispatcher.backend.decodeUtf8(await stream.read(4)) === 'OKAY';
        if (!success) {
            await AdbReverseErrorResponse.deserialize(stream);
        }
        return stream;
    }

    public async list(): Promise<AdbForwardListener[]> {
        const stream = await this.createBufferedStream('reverse:list-forward');

        const response = await AdbReverseStringResponse.deserialize(stream);
        return response.content!.split('\n').map(line => {
            const [deviceSerial, localName, remoteName] = line.split(' ');
            return { deviceSerial, localName, remoteName };
        });

        // No need to close the stream, device will close it
    }

    public async add(
        deviceAddress: string,
        localPort: number,
        handler: AdbReverseHandler,
    ): Promise<string> {
        const stream = await this.sendRequest(`reverse:forward:${deviceAddress};tcp:${localPort}`);

        // `tcp:0` tells the device to pick an available port.
        // However, device will response with the selected port for all `tcp:` requests.
        if (deviceAddress.startsWith('tcp:')) {
            const response = await AdbReverseStringResponse.deserialize(stream);
            deviceAddress = `tcp:${Number.parseInt(response.content!, 10)}`;
        }

        this.localPortToHandler.set(localPort, handler);
        this.deviceAddressToLocalPort.set(deviceAddress, localPort);
        return deviceAddress;

        // No need to close the stream, device will close it
    }

    public async remove(deviceAddress: string): Promise<void> {
        await this.sendRequest(`reverse:killforward:${deviceAddress}`);

        if (this.deviceAddressToLocalPort.has(deviceAddress)) {
            this.localPortToHandler.delete(this.deviceAddressToLocalPort.get(deviceAddress)!);
            this.deviceAddressToLocalPort.delete(deviceAddress);
        }

        // No need to close the stream, device will close it
    }

    public async removeAll(): Promise<void> {
        await this.sendRequest(`reverse:killforward-all`);

        this.deviceAddressToLocalPort.clear();
        this.localPortToHandler.clear();

        // No need to close the stream, device will close it
    }
}
