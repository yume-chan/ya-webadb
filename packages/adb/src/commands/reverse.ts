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
    protected portToHandlerMap = new Map<number, AdbReverseHandler>();

    protected devicePortToPortMap = new Map<number, number>();

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
        if (this.portToHandlerMap.has(port)) {
            this.portToHandlerMap.get(port)!.onStream(e.packet, e.stream);
            e.handled = true;
        }
    }

    public async add(
        port: number,
        handler: AdbReverseHandler,
        devicePort: number = 0,
    ): Promise<number> {
        const stream = await this.dispatcher.createStream(`reverse:forward:tcp:${devicePort};tcp:${port}`);
        const buffered = new AdbBufferedStream(stream);

        const success = this.dispatcher.backend.decodeUtf8(await buffered.read(4)) === 'OKAY';
        if (success) {
            const response = await AdbReverseStringResponse.deserialize(buffered);

            devicePort = Number.parseInt(response.content!, 10);

            this.portToHandlerMap.set(port, handler);
            this.devicePortToPortMap.set(devicePort, port);

            return devicePort;
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

    public async remove(devicePort: number): Promise<void> {
        const stream = await this.dispatcher.createStream(`reverse:killforward:tcp:${devicePort}`);
        const buffered = new AdbBufferedStream(stream);

        const success = this.dispatcher.backend.decodeUtf8(await buffered.read(4)) === 'OKAY';
        if (success) {
            if (this.devicePortToPortMap.has(devicePort)) {
                this.portToHandlerMap.delete(this.devicePortToPortMap.get(devicePort)!);
                this.devicePortToPortMap.delete(devicePort);
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
            this.devicePortToPortMap.clear();
            this.portToHandlerMap.clear();
        } else {
            await AdbReverseErrorResponse.deserialize(buffered);
        }
    }
}
