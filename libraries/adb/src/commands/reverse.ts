// cspell: ignore killforward

import { AutoDisposable } from '@yume-chan/event';
import Struct from '@yume-chan/struct';
import type { Adb } from "../adb.js";
import type { AdbIncomingSocketHandler, AdbSocket } from '../socket/index.js';
import { AdbBufferedStream, BufferedStreamEndedError } from '../stream/index.js';
import { decodeUtf8 } from "../utils/index.js";

export interface AdbForwardListener {
    deviceSerial: string;

    localName: string;

    remoteName: string;
}

const AdbReverseStringResponse =
    new Struct({ littleEndian: true })
        .string('length', { length: 4 })
        .string('content', { lengthField: 'length', lengthFieldBase: 16 });

const AdbReverseErrorResponse =
    new Struct({ littleEndian: true })
        .fields(AdbReverseStringResponse)
        .postDeserialize((value) => {
            throw new Error(value.content);
        });

export class AdbReverseCommand extends AutoDisposable {
    protected localPortToHandler = new Map<number, AdbIncomingSocketHandler>();

    protected deviceAddressToLocalPort = new Map<string, number>();

    protected adb: Adb;

    protected listening = false;

    public constructor(adb: Adb) {
        super();

        this.adb = adb;
        this.addDisposable(this.adb.addIncomingSocketHandler(this.handleIncomingSocket));
    }

    protected handleIncomingSocket = async (socket: AdbSocket) => {
        const address = socket.serviceString;
        // Address format: `tcp:12345\0`
        const port = Number.parseInt(address.substring(4));
        return !!(await this.localPortToHandler.get(port)?.(socket));
    };

    private async createBufferedStream(service: string) {
        const socket = await this.adb.createSocket(service);
        return new AdbBufferedStream(socket);
    }

    private async sendRequest(service: string) {
        const stream = await this.createBufferedStream(service);
        const success = decodeUtf8(await stream.read(4)) === 'OKAY';
        if (!success) {
            await AdbReverseErrorResponse.deserialize(stream);
        }
        return stream;
    }

    public async list(): Promise<AdbForwardListener[]> {
        const stream = await this.createBufferedStream('reverse:list-forward');

        const response = await AdbReverseStringResponse.deserialize(stream);
        return response.content!.split('\n').map(line => {
            const [deviceSerial, localName, remoteName] = line.split(' ') as [string, string, string];
            return { deviceSerial, localName, remoteName };
        });

        // No need to close the stream, device will close it
    }

    /**
     * @param deviceAddress The address adbd on device is listening on. Can be `tcp:0` to let adbd choose an available TCP port by itself.
     * @param localPort Native ADB will open a connection to localPort when reverse connection starts. In webadb, it's only used to uniquely identify a reverse registry, `handler` will be called on connection.
     * @param handler A callback to handle incoming connections
     * @returns If `deviceAddress` is `tcp:0`, return `tcp:{ACTUAL_LISTENING_PORT}`; otherwise, return `deviceAddress`.
     */
    public async add(
        deviceAddress: string,
        localPort: number,
        handler: AdbIncomingSocketHandler,
    ): Promise<string> {
        const stream = await this.sendRequest(`reverse:forward:${deviceAddress};tcp:${localPort}`);

        // `tcp:0` tells the device to pick an available port.
        // Begin with Android 8, device will respond with the selected port for all `tcp:` requests.
        if (deviceAddress.startsWith('tcp:')) {
            let length: number | undefined;
            try {
                length = Number.parseInt(decodeUtf8(await stream.read(4)), 16);
            } catch (e) {
                if (!(e instanceof BufferedStreamEndedError)) {
                    throw e;
                }

                // Device before Android 8 doesn't have this response.
                // (the stream is closed now)
                // Can be safely ignored.
            }

            if (length !== undefined) {
                const port = decodeUtf8(await stream.read(length!));
                deviceAddress = `tcp:${Number.parseInt(port, 10)}`;
            }
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
