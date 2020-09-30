import { AutoDisposable } from '@yume-chan/event';
import { Struct } from '@yume-chan/struct';
import { AdbPacket } from '../packet';
import { AdbBufferedStream, AdbIncomingStreamEventArgs, AdbPacketDispatcher, AdbStream } from '../stream';

export interface AdbReverseHandler {
    onStream(packet: AdbPacket, stream: AdbStream): void;
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
    AdbReverseStringResponse
        .afterParsed((value) => {
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
        this.addDisposable(this.dispatcher.onStream(this.handleStream, this));
    }

    protected handleStream(e: AdbIncomingStreamEventArgs): void {
        if (e.handled) {
            return;
        }

        const address = this.dispatcher.backend.decodeUtf8(e.packet.payload!);
        const port = Number.parseInt(address.substring(4));
        if (this.localPortToHandler.has(port)) {
            this.localPortToHandler.get(port)!.onStream(e.packet, e.stream);
            e.handled = true;
        }
    }

    public async add(
        deviceAddress: string,
        localPort: number,
        handler: AdbReverseHandler,
    ): Promise<string> {
        const stream = await this.dispatcher.createStream(`reverse:forward:${deviceAddress};tcp:${localPort}`);
        const buffered = new AdbBufferedStream(stream);

        const success = this.dispatcher.backend.decodeUtf8(await buffered.read(4)) === 'OKAY';
        if (success) {
            const response = await AdbReverseStringResponse.deserialize(buffered);

            if (deviceAddress === 'tcp:0') {
                deviceAddress = `tcp:${Number.parseInt(response.content!, 10)}`;
            }

            this.localPortToHandler.set(localPort, handler);
            this.deviceAddressToLocalPort.set(deviceAddress, localPort);

            return deviceAddress;
        } else {
            return await AdbReverseErrorResponse.deserialize(buffered);
        }
    }

    public async list(): Promise<AdbForwardListener[]> {
        const stream = await this.dispatcher.createStream('reverse:list-forward');
        const buffered = new AdbBufferedStream(stream);

        const response = await AdbReverseStringResponse.deserialize(buffered);

        return response.content!.split('\n').map(line => {
            const [deviceSerial, localName, remoteName] = line.split(' ');
            return { deviceSerial, localName, remoteName };
        });
    }

    public async remove(deviceAddress: string): Promise<void> {
        const stream = await this.dispatcher.createStream(`reverse:killforward:${deviceAddress}`);
        const buffered = new AdbBufferedStream(stream);

        const success = this.dispatcher.backend.decodeUtf8(await buffered.read(4)) === 'OKAY';
        if (success) {
            if (this.deviceAddressToLocalPort.has(deviceAddress)) {
                this.localPortToHandler.delete(this.deviceAddressToLocalPort.get(deviceAddress)!);
                this.deviceAddressToLocalPort.delete(deviceAddress);
            }
        } else {
            await AdbReverseErrorResponse.deserialize(buffered);
        }
    }

    public async removeAll(): Promise<void> {
        const stream = await this.dispatcher.createStream(`reverse:killforward-all`);
        const buffered = new AdbBufferedStream(stream);

        const success = this.dispatcher.backend.decodeUtf8(await buffered.read(4)) === 'OKAY';
        if (success) {
            this.deviceAddressToLocalPort.clear();
            this.localPortToHandler.clear();
        } else {
            await AdbReverseErrorResponse.deserialize(buffered);
        }
    }
}
